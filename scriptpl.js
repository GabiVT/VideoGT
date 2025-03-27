// Global variables
let currentPlaylist = {
    name: "",
    videos: []
};
let playlists = JSON.parse(localStorage.getItem("playlists")) || [];
let views = JSON.parse(localStorage.getItem("views")) || {};
let currentlyPlayingVideo = null;
let currentPlayingPlaylist = null;
let playerInterval = null;
let fakeProgressInterval = null;
let totalDuration = 0;
let elapsedTime = 0;
let allVideosCompleted = false;

// Page navigation
function showPage(pageId) {
    // Update active menu item
    document.querySelectorAll('.menu a').forEach(item => {
        item.classList.remove('active-page');
    });
    document.getElementById(`menu-${pageId}`).classList.add('active-page');
    
    // Show the selected page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'views') displayPlaylistsViews();
    if (pageId === 'playlists') displayPlaylists();
    if (pageId === 'player') {
        updatePlaylistSelector();
        if (currentPlayingPlaylist !== null) {
            loadSelectedPlaylist();
        }
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelector(`.tab-button[onclick="switchTab('${tabId}')"]`).classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
}

// Add video to current playlist
function addVideo() {
    const input = document.getElementById('video-url');
    let url = input.value.trim();

    if (!url) {
        alert("Introdu un link valid!");
        return;
    }

    let embedUrl = convertToEmbed(url);
    if (!embedUrl) {
        alert("Link invalid! Introdu un link YouTube corect.");
        return;
    }

    // Extract video ID
    let videoId = embedUrl.split('/embed/')[1].split('?')[0];
    
    // Check if video already exists in current playlist
    if (currentPlaylist.videos.some(v => v.id === videoId)) {
        alert("Acest videoclip este deja în playlist!");
        return;
    }
    
    // Add to current playlist
    currentPlaylist.videos.push({
        url: embedUrl.replace("autoplay=1", "autoplay=0"),
        id: videoId,
        name: `Videoclip ${currentPlaylist.videos.length + 1}`,
        duration: 0
    });
    
    // Initialize views if not exists
    if (!views[videoId]) {
        views[videoId] = {
            count: 0,
            duration: 0
        };
    }
    
    displayThumbnails();
    input.value = "";
}

function convertToEmbed(url) {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        let videoId = url.includes("v=") ? url.split("v=")[1].split("&")[0] : 
                      url.includes("youtu.be/") ? url.split("youtu.be/")[1].split("?")[0] : 
                      url.split("/embed/")[1].split("?")[0];
        return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&mute=1`;
    }
    return null;
}

function displayThumbnails() {
    const thumbnailsContainer = document.getElementById('thumbnails');
    thumbnailsContainer.innerHTML = "";

    currentPlaylist.videos.forEach((video, index) => {
        const videoBox = document.createElement('div');
        videoBox.classList.add('video-box');

        const videoInfo = document.createElement('div');
        videoInfo.classList.add('video-info');
        videoInfo.innerHTML = `
            <span>${video.name}</span>
            <div class="video-actions">
                <button class="play-btn" onclick="togglePlayVideo(${index})" id="play-btn-${index}">▶</button>
                <span class="remove-btn" onclick="removeVideo(${index})">×</span>
            </div>
        `;

        const iframe = document.createElement('iframe');
        iframe.src = video.url;
        iframe.width = "100%";
        iframe.height = "100%";
        iframe.frameBorder = "0";
        iframe.allowFullscreen = true;
        iframe.id = `video-${index}`;

        videoBox.appendChild(videoInfo);
        videoBox.appendChild(iframe);
        thumbnailsContainer.appendChild(videoBox);
    });
}

function togglePlayVideo(index) {
    const btn = document.getElementById(`play-btn-${index}`);
    const iframe = document.getElementById(`video-${index}`);
    
    if (btn.classList.contains('playing')) {
        // Pause the video
        iframe.src = iframe.src.replace("autoplay=1", "autoplay=0");
        btn.textContent = '▶';
        btn.classList.remove('playing');
        currentlyPlayingVideo = null;
    } else {
        // Play the video
        iframe.src = iframe.src.replace("autoplay=0", "autoplay=1");
        btn.textContent = '⏸';
        btn.classList.add('playing');
        currentlyPlayingVideo = index;
        
        // Track view for this video
        trackView(currentPlaylist.videos[index].id);
    }
}

function removeVideo(index) {
    currentPlaylist.videos.splice(index, 1);
    // Renumber remaining videos
    currentPlaylist.videos.forEach((video, idx) => {
        video.name = `Videoclip ${idx + 1}`;
    });
    displayThumbnails();
}

function togglePlaylist(index) {
    const playlistItem = document.getElementById(`playlist-item-${index}`);
    playlistItem.classList.toggle('expanded');
}

function trackView(videoId) {
    if (!views[videoId]) {
        views[videoId] = {
            count: 0,
            duration: 0
        };
    }
    
    // Add 1 view for this video
    views[videoId].count++;
    
    localStorage.setItem("views", JSON.stringify(views));
    displayPlaylistsViews(); // Update views display
}

function savePlaylist() {
    const nameInput = document.getElementById('playlist-name');
    let name = nameInput.value.trim();
    
    if (!name) {
        alert("Introdu un nume pentru playlist!");
        return;
    }
    
    if (currentPlaylist.videos.length === 0) {
        alert("Adaugă cel puțin un videoclip în playlist!");
        return;
    }
    
    currentPlaylist.name = name;
    
    // Check if playlist exists
    let existingIndex = playlists.findIndex(p => p.name === name);
    if (existingIndex >= 0) {
        playlists[existingIndex] = JSON.parse(JSON.stringify(currentPlaylist));
    } else {
        playlists.push(JSON.parse(JSON.stringify(currentPlaylist)));
    }
    
    localStorage.setItem("playlists", JSON.stringify(playlists));
    
    // Reset form for new playlist
    nameInput.value = "";
    currentPlaylist = { name: "", videos: [] };
    document.getElementById('thumbnails').innerHTML = "";
    document.getElementById('global-progress').style.width = "0%";
    document.getElementById('progress-text').textContent = "0% complet";
    
    displayPlaylists();
    updatePlaylistSelector();
}

function displayPlaylists() {
    const playlistsContainer = document.getElementById('playlists-list');
    playlistsContainer.innerHTML = "";
    
    if (playlists.length === 0) {
        playlistsContainer.innerHTML = "<p>Nu există playlisturi salvate.</p>";
        return;
    }
    
    playlists.forEach((playlist, index) => {
        const playlistItem = document.createElement('div');
        playlistItem.classList.add('playlist-item');
        playlistItem.id = `playlist-item-${index}`;
        playlistItem.onclick = (e) => {
            // Only toggle if not clicking on a button
            if (!e.target.closest('button')) {
                togglePlaylist(index);
            }
        };
        
        playlistItem.innerHTML = `
            <h3>${playlist.name}</h3>
            <div class="playlist-content">
                <div style="margin-left: 20px;">
                    ${playlist.videos.map(v => `<p>${v.name}</p>`).join('')}
                </div>
                <div class="playlist-actions">
                    <button onclick="loadPlaylist(${index}); event.stopPropagation();">Vezi/Editează</button>
                    <button class="danger" onclick="deletePlaylist(${index}); event.stopPropagation();">Șterge</button>
                    <button onclick="sharePlaylist(${index}); event.stopPropagation();">Partajează</button>
                </div>
            </div>
        `;
        
        playlistsContainer.appendChild(playlistItem);
    });
}

function displayPlaylistsViews() {
    const viewsContainer = document.getElementById('playlists-views-list');
    viewsContainer.innerHTML = "";
    
    if (playlists.length === 0) {
        viewsContainer.innerHTML = "<p>Nu există playlisturi salvate.</p>";
        return;
    }
    
    playlists.forEach((playlist, index) => {
        const playlistItem = document.createElement('div');
        playlistItem.classList.add('playlist-item');
        playlistItem.id = `playlist-views-item-${index}`;
        playlistItem.onclick = (e) => {
            if (!e.target.closest('button')) {
                togglePlaylistViews(index);
            }
        };
        
        playlistItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3>${playlist.name}</h3>
                <button class="report-btn" onclick="generateReport(${index}); event.stopPropagation();">📥 Raport</button>
            </div>
            <div class="playlist-content">
                <div class="stats-container">
                    ${playlist.videos.map(v => {
                        const viewCount = views[v.id] ? views[v.id].count : 0;
                        return `<div class="stats-item">
                            <div><strong>${v.name}</strong></div>
                            <div style="font-weight: bold; color: #2c3e50;">${viewCount} vizionări</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;
        
        viewsContainer.appendChild(playlistItem);
    });
}

function generateReport(playlistIndex) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const playlist = playlists[playlistIndex];
    const date = new Date().toLocaleDateString();
    
    // Add title
    doc.setFontSize(18);
    doc.text(`Raport Vizionări - ${playlist.name}`, 14, 20);
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Generat la: ${date}`, 14, 30);
    
    // Add table with video stats
    const tableData = playlist.videos.map(video => {
        const stats = views[video.id] || { count: 0, duration: 0 };
        return [
            video.name,
            stats.count.toString(),
            formatDuration(stats.duration)
        ];
    });
    
    // Add total row
    const totalViews = playlist.videos.reduce((sum, video) => {
        return sum + ((views[video.id] && views[video.id].count) || 0);
    }, 0);
    
    const totalDuration = playlist.videos.reduce((sum, video) => {
        return sum + ((views[video.id] && views[video.id].duration) || 0);
    }, 0);
    
    tableData.push([
        'TOTAL',
        totalViews.toString(),
        formatDuration(totalDuration)
    ]);
    
    doc.autoTable({
        startY: 40,
        head: [['Videoclip', 'Vizionări', 'Durata totală']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [52, 152, 219],
            textColor: 255
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        }
    });
    
    // Save the PDF
    doc.save(`Raport_${playlist.name.replace(/[^a-z0-9]/gi, '_')}_${date.replace(/\//g, '-')}.pdf`);
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        secs.toString().padStart(2, '0')
    ].join(':');
}

function togglePlaylistViews(index) {
    const playlistItem = document.getElementById(`playlist-views-item-${index}`);
    playlistItem.classList.toggle('expanded');
}

function loadPlaylist(index) {
    currentPlayingPlaylist = index;
    currentPlaylist = JSON.parse(JSON.stringify(playlists[index]));
    document.getElementById('playlist-name').value = currentPlaylist.name;
    document.getElementById('global-progress').style.width = "0%";
    document.getElementById('progress-text').textContent = "0% complet";
    displayThumbnails();
    showPage('add-playlist');
    switchTab('manual');
}

function updatePlaylistSelector() {
    const selector = document.getElementById('playlist-select');
    selector.innerHTML = '<option value="">-- Selectează un playlist --</option>';
    
    playlists.forEach((playlist, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = playlist.name;
        selector.appendChild(option);
    });
    
    if (currentPlayingPlaylist !== null) {
        selector.value = currentPlayingPlaylist;
    }
}

function loadSelectedPlaylist() {
    const selector = document.getElementById('playlist-select');
    const selectedIndex = parseInt(selector.value);
    
    if (isNaN(selectedIndex)) {
        document.getElementById('player-thumbnails').innerHTML = "";
        document.getElementById('player-progress').style.width = "0%";
        document.getElementById('player-progress-text').textContent = "0% complet";
        currentPlayingPlaylist = null;
        clearInterval(playerInterval);
        clearInterval(fakeProgressInterval);
        allVideosCompleted = false;
        return;
    }
    
    currentPlayingPlaylist = selectedIndex;
    const playlist = playlists[selectedIndex];
    
    document.getElementById('player-thumbnails').innerHTML = "";
    
    // Calculate total duration
    totalDuration = playlist.videos.reduce((sum, video) => sum + (video.duration || 0), 0);
    elapsedTime = 0;
    allVideosCompleted = false;
    
    playlist.videos.forEach((video, index) => {
        const videoBox = document.createElement('div');
        videoBox.classList.add('video-box');

        const videoInfo = document.createElement('div');
        videoInfo.classList.add('video-info');
        videoInfo.innerHTML = `
            <span>${video.name}</span>
            <div class="video-actions">
                <button class="play-btn" onclick="togglePlayerVideo(${index})" id="player-play-btn-${index}">▶</button>
            </div>
        `;

        const iframe = document.createElement('iframe');
        iframe.src = video.url;
        iframe.width = "100%";
        iframe.height = "100%";
        iframe.frameBorder = "0";
        iframe.allowFullscreen = true;
        iframe.id = `player-video-${index}`;
        
        // Set up event listeners for this iframe
        iframe.onload = function() {
            try {
                let player = iframe.contentWindow;
                player.postMessage('{"event":"listening","id":0}', '*');
                player.postMessage('{"event":"command","func":"getDuration","args":""}', '*');
            } catch (e) {}
        };

        videoBox.appendChild(videoInfo);
        videoBox.appendChild(iframe);
        document.getElementById('player-thumbnails').appendChild(videoBox);
    });
    
    // Update progress bar
    document.getElementById('player-progress').style.width = "0%";
    document.getElementById('player-progress-text').textContent = "0% complet";
    
    // Start tracking progress
    startProgressTracking();
}

function startProgressTracking() {
    clearInterval(playerInterval);
    clearInterval(fakeProgressInterval);
    
    // Start with 0% progress
    let fakeProgress = 0;
    fakeProgressInterval = setInterval(() => {
        fakeProgress += 2.5; // 50% in 20 seconds (2.5% per second)
        if (fakeProgress >= 50) {
            clearInterval(fakeProgressInterval);
            fakeProgress = 50;
        }
        document.getElementById('player-progress').style.width = `${fakeProgress}%`;
        document.getElementById('player-progress-text').textContent = `${Math.round(fakeProgress)}% complet`;
    }, 1000);

    playerInterval = setInterval(() => {
        if (currentPlayingPlaylist === null) {
            clearInterval(playerInterval);
            return;
        }
        
        const playlist = playlists[currentPlayingPlaylist];
        let anyVideoPlaying = false;
        
        playlist.videos.forEach((video, index) => {
            const iframe = document.getElementById(`player-video-${index}`);
            if (iframe) {
                try {
                    // Get current time for each video
                    iframe.contentWindow.postMessage('{"event":"command","func":"getCurrentTime","args":""}', '*');
                    
                    // Check if any video is still playing
                    const btn = document.getElementById(`player-play-btn-${index}`);
                    if (btn && btn.classList.contains('playing')) {
                        anyVideoPlaying = true;
                    }
                } catch (e) {}
            }
        });
        
        // Check if all videos have completed
        if (!anyVideoPlaying && !allVideosCompleted) {
            allVideosCompleted = true;
            // Animate progress to 100% in 5 seconds
            const currentProgress = parseFloat(document.getElementById('player-progress').style.width) || 0;
            const targetProgress = 100;
            const duration = 5000; // 5 seconds
            const startTime = Date.now();
            
            const animateTo100 = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(currentProgress + (targetProgress - currentProgress) * (elapsed / duration), targetProgress);
                
                document.getElementById('player-progress').style.width = `${progress}%`;
                document.getElementById('player-progress-text').textContent = `${Math.round(progress)}% complet`;
                
                if (progress < targetProgress) {
                    requestAnimationFrame(animateTo100);
                }
            };
            
            animateTo100();
        }
    }, 1000);
}

// Handle YouTube player events
window.addEventListener("message", (event) => {
    if (event.data && typeof event.data === "string") {
        try {
            const data = JSON.parse(event.data);
            
            // Handle duration information
            if (data.event === "info" && data.func === "getDuration") {
                const iframe = event.source.frameElement;
                if (iframe) {
                    const videoId = iframe.id.replace('player-video-', '');
                    const duration = data.info;
                    
                    if (currentPlayingPlaylist !== null) {
                        playlists[currentPlayingPlaylist].videos[videoId].duration = duration;
                        totalDuration = playlists[currentPlayingPlaylist].videos.reduce((sum, video) => sum + (video.duration || 0), 0);
                        localStorage.setItem("playlists", JSON.stringify(playlists));
                    }
                }
            }
            
            // Handle current time information
            if (data.event === "info" && data.func === "getCurrentTime") {
                const iframe = event.source.frameElement;
                if (iframe && currentPlayingPlaylist !== null) {
                    const videoIndex = parseInt(iframe.id.replace('player-video-', ''));
                    const currentTime = data.info;
                    const videoDuration = playlists[currentPlayingPlaylist].videos[videoIndex].duration || 0;
                    
                    // Calculate total elapsed time
                    elapsedTime = 0;
                    for (let i = 0; i < videoIndex; i++) {
                        elapsedTime += playlists[currentPlayingPlaylist].videos[i].duration || 0;
                    }
                    elapsedTime += currentTime;
                    
                    // Update progress bar (only if not in the fake progress phase)
                    if (fakeProgressInterval === null || allVideosCompleted) {
                        const progressPercent = totalDuration > 0 ? (elapsedTime / totalDuration) * 100 : 0;
                        document.getElementById('player-progress').style.width = `${progressPercent}%`;
                        document.getElementById('player-progress-text').textContent = `${Math.round(progressPercent)}% complet`;
                    }
                }
            }
            
            // Handle video end (state = 0)
            if (data.event === "onStateChange" && data.info === 0) {
                const iframe = event.source.frameElement;
                if (iframe && currentPlayingPlaylist !== null) {
                    const videoIndex = parseInt(iframe.id.replace('player-video-', ''));
                    const btn = document.getElementById(`player-play-btn-${videoIndex}`);
                    if (btn) {
                        btn.textContent = '▶';
                        btn.classList.remove('playing');
                    }
                }
            }
        } catch (e) {
            console.error("Error processing YouTube API message:", e);
        }
    }
});

function playAllVideos() {
    if (currentPlayingPlaylist === null) return;
    
    const playlist = playlists[currentPlayingPlaylist];
    playlist.videos.forEach((video, index) => {
        const iframe = document.getElementById(`player-video-${index}`);
        const btn = document.getElementById(`player-play-btn-${index}`);
        
        if (iframe && btn) {
            iframe.src = iframe.src.replace("autoplay=0", "autoplay=1");
            btn.textContent = '⏸';
            btn.classList.add('playing');
            
            // Track view for this video
            trackView(video.id);
        }
    });
    
    // Reset completion flag
    allVideosCompleted = false;
    
    // Start tracking progress if not already
    startProgressTracking();
}

function togglePlayerVideo(index) {
    const btn = document.getElementById(`player-play-btn-${index}`);
    const iframe = document.getElementById(`player-video-${index}`);
    
    if (btn.classList.contains('playing')) {
        // Pause the video
        iframe.src = iframe.src.replace("autoplay=1", "autoplay=0");
        btn.textContent = '▶';
        btn.classList.remove('playing');
    } else {
        // Play the video
        iframe.src = iframe.src.replace("autoplay=0", "autoplay=1");
        btn.textContent = '⏸';
        btn.classList.add('playing');
        
        // Track view for this video
        trackView(playlists[currentPlayingPlaylist].videos[index].id);
        
        // Reset completion flag
        allVideosCompleted = false;
        
        // Start tracking progress if not already
        startProgressTracking();
    }
}

function deletePlaylist(index) {
    if (confirm(`Sigur vrei să ștergi playlistul "${playlists[index].name}"?`)) {
        playlists.splice(index, 1);
        localStorage.setItem("playlists", JSON.stringify(playlists));
        displayPlaylists();
        displayPlaylistsViews();
        updatePlaylistSelector();
        
        if (currentPlayingPlaylist === index) {
            currentPlayingPlaylist = null;
            document.getElementById('player-thumbnails').innerHTML = "";
            document.getElementById('player-progress').style.width = "0%";
            document.getElementById('player-progress-text').textContent = "0% complet";
            document.getElementById('playlist-select').value = "";
            clearInterval(playerInterval);
            clearInterval(fakeProgressInterval);
            allVideosCompleted = false;
        } else if (currentPlayingPlaylist > index) {
            currentPlayingPlaylist--;
        }
    }
}

function sharePlaylist(index) {
    const playlistData = JSON.stringify(playlists[index]);
    const encodedData = btoa(unescape(encodeURIComponent(playlistData)));
    
    // Create a temporary textarea to copy the encoded data
    const textarea = document.createElement('textarea');
    textarea.value = encodedData;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    alert("Playlist codat copiat în clipboard! Poți să-l trimiți altor utilizatori.");
}

function importPlaylist() {
    const encodedData = document.getElementById('share-playlist-data').value.trim();
    
    if (!encodedData) {
        alert("Introdu datele codate ale playlistului pentru import!");
        return;
    }
    
    try {
        const playlistData = decodeURIComponent(escape(atob(encodedData)));
        const importedPlaylist = JSON.parse(playlistData);
        
        if (!importedPlaylist.name || !Array.isArray(importedPlaylist.videos)) {
            throw new Error("Format invalid");
        }
        
        // Renumber video names
        importedPlaylist.videos.forEach((video, index) => {
            video.name = `Videoclip ${index + 1}`;
            video.duration = video.duration || 0;
        });
        
        // Add to playlists
        playlists.push(importedPlaylist);
        localStorage.setItem("playlists", JSON.stringify(playlists));
        
        // Clear import field
        document.getElementById('share-playlist-data').value = "";
        
        alert("Playlist importat cu succes!");
        displayPlaylists();
        updatePlaylistSelector();
        switchTab('manual');
    } catch (e) {
        alert("Date invalide pentru playlist. Verifică formatul codat.");
        console.error(e);
    }
}

// Initialize
window.onload = function() {
    // Set initial active menu item
    document.getElementById('menu-add-playlist').classList.add('active-page');
    
    displayPlaylists();
    displayPlaylistsViews();
    updatePlaylistSelector();
    
    // Set up message listener for YouTube API
    window.addEventListener("message", (event) => {
        if (event.data && typeof event.data === "string") {
            try {
                const data = JSON.parse(event.data);
                
                // Handle video title
                if (data.event === "info" && data.func === "getVideoData") {
                    if (data.info && data.info.title) {
                        const iframe = event.source.frameElement;
                        if (iframe) {
                            const videoId = iframe.src.split('/embed/')[1].split('?')[0];
                            const videoBox = iframe.parentElement;
                            const videoInfo = videoBox.querySelector('.video-info span:first-child');
                            if (videoInfo) {
                                videoInfo.textContent = data.info.title;
                            }
                        }
                    }
                }
            } catch (e) {}
        }
    });
};