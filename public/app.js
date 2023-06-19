// script.js

document.addEventListener('DOMContentLoaded', () => {
    const socket = io("https://hyeontae.shop", { transports: ['websocket'] }); // 주소 그때그때바꿔줘야함
    socket.on('connect_error', (err) => {
      console.log(`Connect error due to ${err.message}`);
    });
    
  
    // Get DOM elements
    const roomInput = document.getElementById('room');
    const nicknameInput = document.getElementById('nickname');
    const joinButton = document.getElementById('join');
    const membersList = document.getElementById('members');
    const controls = document.getElementById('controls');
  
    // Store peers connections, streams, and audio tracks
    let peers = {};
    let localStream;
    let localAudioTrack;
  
    joinButton.onclick = () => {
        const roomName = roomInput.value;
        const nickname = nicknameInput.value;
      
        // First get user media, then join room
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then(stream => {
            localStream = stream;
            localAudioTrack = stream.getAudioTracks()[0];
            const muteButton = document.createElement('button');
            muteButton.textContent = 'Mute';
            muteButton.onclick = toggleMute;
            controls.appendChild(muteButton);
      
            // Now join the room
            socket.emit('join_room', roomName, nickname);
          })
          .catch(error => {
            console.error('Error accessing audio: ', error);
          });
      };
      
  
    const toggleMute = () => {
      if (localAudioTrack) {
        localAudioTrack.enabled = !localAudioTrack.enabled;
        const muteButton = controls.querySelector('button');
        muteButton.textContent = localAudioTrack.enabled ? 'Mute' : 'Unmute';
      }
    };
  
    socket.on('accept_join', (users) => {
      users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.nickname;
        membersList.appendChild(li);
  
        createPeerConnection(user.socketId);
      });
    });
  
    socket.on('offer', (offer, remoteSocketId, localNickname) => {
      handleOffer(remoteSocketId, offer);
    });
  
    socket.on('answer', (answer, remoteSocketId) => {
      handleAnswer(remoteSocketId, answer);
    });
  
    socket.on('ice', (ice, remoteSocketId) => {
      handleIceCandidate(remoteSocketId, ice);
    });
  
    socket.on('leave_room', (socketId, nickname) => {
      closePeerConnection(socketId);
    });

    socket.on('new_user', (user) => {
        const li = document.createElement('li');
        li.textContent = user.nickname;
        membersList.appendChild(li);
    });
  
    function createPeerConnection(socketId) {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
            {
              urls: [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
                "stun:stun3.l.google.com:19302",
                "stun:stun4.l.google.com:19302",
              ],
            },
          ],
      });

      peerConnection.ontrack = (event) => {
        
        const audio = document.createElement('audio');
        audio.srcObject = event.streams[0];
        audio.controls = true;  // Add this line
        audio.autoplay = true;
        console.log(audio)
        document.body.appendChild(audio);
      };
  
      peers[socketId] = peerConnection;
  
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
  
      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('ice', event.candidate, socketId);
        }
      };
  
      peerConnection.createOffer()
        .then(offer => {
          return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
          socket.emit('offer', peerConnection.localDescription, socketId, nicknameInput.value);
        });
    }
  
    function handleOffer(socketId, offer) {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
            {
              urls: [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
                "stun:stun3.l.google.com:19302",
                "stun:stun4.l.google.com:19302",
              ],
            },
          ],
      });

      peerConnection.ontrack = (event) => {
        const audio = document.createElement('audio');
        audio.srcObject = event.streams[0];
        audio.controls = true;  // Add this line
        audio.autoplay = true;
        document.body.appendChild(audio);
      };
  
      peers[socketId] = peerConnection;
  
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
  
      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('ice', event.candidate, socketId);
        }
      };
  
      peerConnection.setRemoteDescription(offer)
        .then(() => {
          return peerConnection.createAnswer();
        })
        .then(answer => {
          return peerConnection.setLocalDescription(answer);
        })
        .then(() => {
          socket.emit('answer', peerConnection.localDescription, socketId);
        });
    }
  
    function handleAnswer(socketId, answer) {
      const peerConnection = peers[socketId];
      peerConnection.setRemoteDescription(answer);
    }
  
    function handleIceCandidate(socketId, iceCandidate) {
      const peerConnection = peers[socketId];
      peerConnection.addIceCandidate(iceCandidate);
    }
  
    function closePeerConnection(socketId) {
      const peerConnection = peers[socketId];
      peerConnection.close();
      delete peers[socketId];
    }
  });
  