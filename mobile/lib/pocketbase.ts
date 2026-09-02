import PocketBase from 'pocketbase';

export const POCKETBASE_URL = 'https://alipo.vercel.app';

export const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

export const isAuthValid = () => pb.authStore.isValid;
export const getAuthUser = () => pb.authStore.model;
export const logoutUser = () => pb.authStore.clear();
