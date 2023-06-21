// const wsServer = require('./server.js');

// /* ---------- Redis ------------- */
// const redis = require('redis');
// const client =  redis.createClient({
//   socket: {
//       host: process.env.LOCAL_SERVER, // ec2 상에서는 변경 필요
//       port: 6379 // default
//   }
// });

// client.on('error', err => console.log('Redis Server Error', err));
// /* ----------- Redis -------------- */
//     /* set 사용하는 방식 */  
    // const yjsDocToString = await JSON.stringify(update.yjsDoc);
    // await client.set(projectId, yjsDocToString, (err) => {
    //     if (err) console.error(err);
    // })
//     /* 두가지 방법 속도 비교해봐야 함 */ 

// wsServer.on('connection', (socket) => {
//     socket.on('yjs-update', async (update) => {
//         const projectId = update.projectId;
//         const yjsDoc = update.yjsDoc; // yjsDoc contains "node" and "edge" properties

//         /* Hset 사용하는 방식 -> nested 처리 안돼있음 */

//         // Separate handling for nodes and edges
//         ['node', 'edge'].forEach(type => {
//             const items = yjsDoc[type];  // items is an array of nodes or edges

//             // Start a Redis MULTI transaction
//             const multi = client.multi();

//             items.forEach(item => {
//                 // Key is something like "node:100" or "edge:e-107bottom-108top"
//                 const key = `${type}:${item.id}`;

//                 // Retrieve the existing item from Redis
//                 client.hget(projectId, key, (err, existingItemString) => {
//                     if (err) {
//                         console.error(err);
//                         // Send error message to the client
//                         socket.emit('yjs-update-result', { success: false, error: err });
//                         return;
//                     }

//                     const newItemString = JSON.stringify(item);

//                     // Only update Redis if the item has changed
//                     if (newItemString !== existingItemString) {
//                         // Add the HSET command to the MULTI transaction
//                         multi.hset(projectId, key, newItemString);
//                     }
//                 });
//             });

//             // Execute the MULTI transaction
//             multi.exec((err, replies) => {
//                 if (err) {
//                     console.error(err);
//                     // Send error message to the client
//                     socket.emit('yjs-update-result', { success: false, error: err });
//                 } else {
//                     // Send success message to the client
//                     socket.emit('yjs-update-result', { success: true });
//                 }
//             });
//         });
//     });
// });
