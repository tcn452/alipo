import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090';

// Global singleton client for PocketBase
export const pb = new PocketBase(POCKETBASE_URL);

// Disable auto-cancellation to allow concurrent fetches in React Strict Mode
pb.autoCancellation(false);

export const isAuthValid = () => pb.authStore.isValid;
export const getAuthUser = () => pb.authStore.model;
export const logoutUser = () => pb.authStore.clear();
