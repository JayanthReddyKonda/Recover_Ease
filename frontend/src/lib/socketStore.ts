/**
 * Module-level socket singleton.
 * The useSocket hook sets this when connected; components import it to emit events.
 */
import type { Socket } from "socket.io-client";

let _socket: Socket | null = null;

export const socketStore = {
    set: (s: Socket | null) => { _socket = s; },
    get: () => _socket,
};
