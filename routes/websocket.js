// WebSocket 서버 생성 : node.js에서 제공하는 ws 모듈을 사용
const WebSocket = require('ws');
const wss = new WebSocket.Server({port:8000});
const clients = new Map();  // 클라이언트 관리를 위한 객체 생성

// Y.js와 백엔드 어댑터 설치 (npm install yjs y-websocket y-leveldb)
const Y = require('yjs');
const { WebsocketProvider } = require('y-websocket');
const { LevelDB } = require('y-leveldb');

// Y.Doc 인스턴스 생성
const doc = new Y.doc();

// LevelDB 어댑터 연결
const levelDBProvider = new LevelDB('path/to/db', doc);     

// WebRTC provider 생성
const webrtcProvider = new WebrtcProvider('room-name', doc, {
    // y-leveldb를 사용하여 변경사항을 동기화
    leveldb: levelDBProvider,
  });

// 변경사항 처리 이벤트 핸들러
doc.on('update', (update) => {
    // update 객체를 통해 변경사항에 대한 정보를 얻을 수 있음
})


/***********클라이언트 관련 함수 생성************/

// 클라이언트 정보 저장 함수
function saveClientInfo(ws, clientInfo) {
    clients.set(ws, clientInfo);
}

// 클라이언트 정보 조회 함수(1)
function getClientInfo(ws) {
    return clients.get(ws);
}

// 클라이언트 정보 조회 함수(2) : 식별자 기반 조회
function getClientInfoById(clientId) {
    for (const[ws, clientInfo] of clients.entries()) {
        if (clientInfo.id === clientId) {
            return clientInfo;
        }
    }
    return null;
}

// 클라이언트 정보 삭제 함수 : 프로젝트에서 탈퇴 시 사용
function removeClientInfo(ws) {
    clients.delete(ws);
}

// 연결 종료 처리 함수
function Disconnect(ws) {
    // 클라이언트 정보 관리
    const clientInfo = getClientInfoById(clientId);

    if (clientInfo) {
        // 클라이언트 정보 저장 & 다른 사용자에게 종료 알림
        saveClientInfo(clientInfo);
        notifyOtherUsers(clientId);

        // // 리소스 정리 : 메모리 누수 방지
        // releaseClientResources(clientId);
    }

    
}


/*********** Web Socket 송수신 ************/

// WebSocket 연결 요청을 수신하고 처리
wss.on('connection', (ws) => {
    const awareness = webrtcProvider.awareness;

    // 클라이언트의 웹소켓 인스턴스로부터 Y.Doc의 내용을 동기화
    awareness.setLocalStateField('user', { name: 'dohee' });
    awareness.setLocalState(null);

    // 클라이언트와의 변경 사항 동기화
    webrtcProvider.on('synced', () => {
        // 동기화 완료 후 수행할 작업
    });

    // awareness 객체를 통해 클라이언트 상태를 관리하고, 
    // setLocalStateField 및 setLocalState를 사용하여 클라이언트의 상태 정보를 설정. 
    // 이후 변경 사항이 동기화되면 synced 이벤트가 발생하므로, 
    // 해당 이벤트를 활용하여 동기화 완료 후 수행해야 할 작업을 처리 가능
    
    // 클라이언트 정보 생성 및 저장
    const clientInfo = {
        id: generateClientId(),
        // 기타 정보들....
    };
    saveClientInfo(ws, clientInfo);

    // 클라이언트로부터 데이터를 수신할 때 발생하는 이벤트 핸들러
    // --> 데이터 파싱 OR 필요한 작업 수행
    ws.on('message', (data) => {
        const clientInfo = getClientInfo(ws);

        if (clientInfo) {
            // 데이터 파싱
            const parseData = JSON.parse(data);

            // 기타 추가 작업 : 뭐 해야하지
        }

        // 클라이언트로 데이터 보내는 방법
        ws.send('안뇽~~~');
    });

    // 클라이언트로부터 연결이 종료될 때 발생하는 이벤트 핸들러
    ws.on('close', () => {
        // 연결 종료 처리 
        Disconnect(ws);
    });
});