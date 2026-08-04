import client from './client';

export interface Driver {
  id: string;
  name: string;
  nickname?: string;
  mobile?: string;
  is_active: boolean;
}

export async function fetchDrivers(): Promise<Driver[]> {
  const response = await client.get('/drivers/');
  return response.data;
}

export async function createDriver(name: string, nickname?: string, mobile?: string, is_active: boolean = true): Promise<Driver> {
  const response = await client.post('/drivers/', {
    name,
    nickname,
    mobile,
    is_active
  });
  return response.data;
}

export async function updateDriver(id: string, updates: Partial<Driver>): Promise<Driver> {
  const response = await client.put(`/drivers/${id}`, updates);
  return response.data;
}

export async function deleteDriver(id: string): Promise<void> {
  await client.delete(`/drivers/${id}`);
}
