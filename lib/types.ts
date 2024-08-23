export type User = {
  username: string;
  password: string | null;
  avatar: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_deleted: boolean;
  deletedAt: Date | null;
};
export type Business = {
  name: string;
  email: string;
  logo: string;
  phone: string;
  location: string | Location;
  country: string;
  city: string;
  state: string;
  zip_code: string;

  user: string;
};

export type Location = {
  address: string;
  country?: string;
  country_code?: string;
  city?: string;
  longitude: number;
  latitude: number;
};
