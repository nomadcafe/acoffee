export type Pin = {
  id: string;
  lat: number;
  lng: number;
  nickname: string | null;
  createdAt: string;
};

export type Subscriber = {
  id: string;
  email: string;
  city: string | null;
  createdAt: string;
};
