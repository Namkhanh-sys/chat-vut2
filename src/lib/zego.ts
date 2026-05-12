// ZegoCloud Configuration
// Lấy AppID và ServerSecret từ https://console.zegocloud.com/

export const ZEGO_APP_ID = 520166556; 
export const ZEGO_SERVER_SECRET = "123d884f63df530ce606be3f92b9a073"; 

export const generateRoomId = (id: string) => `room_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;
