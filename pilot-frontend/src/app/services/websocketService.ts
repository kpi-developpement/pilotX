import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// L'URL dyal Spring Boot (b l'port jdid li derti)
const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL + '/ws';

export const createWebSocketClient = (onMessageReceived: (message: any) => void) => {
    const client = new Client({
        webSocketFactory: () => new SockJS(SOCKET_URL),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
            console.log('Connected to WebSocket!');
            client.subscribe('/topic/pilots', (message) => {
                if (message.body) {
                    onMessageReceived(JSON.parse(message.body));
                }
            });
        },
        onStompError: (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        },
    });

    return client;
};