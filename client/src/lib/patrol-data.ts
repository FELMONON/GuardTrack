export const CALGARY_PATROL_SITES = [
  {
    id: 1,
    name: "Delaney",
    address: "851 17 Ave NW, Calgary, AB T2M 5B8",
    latitude: 51.0447,
    longitude: -114.0719,
    geofenceRadius: 60,
  },
  {
    id: 2,
    name: "Trico Homes HQ",
    address: "100-7711 Macleod Trail S, Calgary, AB",
    latitude: 50.9916,
    longitude: -114.0708,
    geofenceRadius: 60,
  },
  {
    id: 3,
    name: "Shawville",
    address: "108 Shawville Pl SE, Calgary, AB",
    latitude: 50.9034,
    longitude: -114.0105,
    geofenceRadius: 60,
  },
  {
    id: 4,
    name: "Centre Street",
    address: "2017 Centre St N, Calgary, AB T2E 2S9",
    latitude: 51.0814,
    longitude: -114.0581,
    geofenceRadius: 60,
  },
  {
    id: 5,
    name: "Legacy",
    address: "47 Legacy Vw S E, Calgary, AB T2X 2C3",
    latitude: 50.9008,
    longitude: -113.9564,
    geofenceRadius: 60,
  },
  {
    id: 6,
    name: "Trico Warehouse",
    address: "4214 54 Ave SE, Calgary, AB T2C 2E3",
    latitude: 50.9734,
    longitude: -113.9584,
    geofenceRadius: 60,
  },
];

export const generateDeviceId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 9);
  return `device-${timestamp}-${randomPart}`;
};

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('patrol-device-id');
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('patrol-device-id', deviceId);
  }
  return deviceId;
};
