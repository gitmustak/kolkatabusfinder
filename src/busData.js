// Sample data for Kolkata bus routes
// Each route has a name and a list of stops in order

export const stops = {
  Howrah: { lat: 22.585, lng: 88.329 },
  Esplanade: { lat: 22.567, lng: 88.353 },
  'Park Street': { lat: 22.553, lng: 88.352 },
  Gariahat: { lat: 22.517, lng: 88.365 },
  Jadavpur: { lat: 22.498, lng: 88.370 },
  Ultadanga: { lat: 22.601, lng: 88.401 },
  Shyambazar: { lat: 22.601, lng: 88.373 },
  Rashbehari: { lat: 22.517, lng: 88.353 },
  Tollygunge: { lat: 22.492, lng: 88.346 },
  'Rabindra Sadan': { lat: 22.544, lng: 88.352 },
  Kalighat: { lat: 22.520, lng: 88.340 },
  Garia: { lat: 22.465, lng: 88.428 },
  Dunlop: { lat: 22.646, lng: 88.370 },
  Sealdah: { lat: 22.565, lng: 88.368 },
  'Park Circus': { lat: 22.539, lng: 88.364 },
  Barasat: { lat: 22.721, lng: 88.481 },
  // Added stops
  Chingrighata: { lat: 22.547, lng: 88.413 },
  'Sector V': { lat: 22.579, lng: 88.431 },
  Newtown: { lat: 22.581, lng: 88.465 },
  Sapoorji: { lat: 22.613, lng: 88.491 },
};

export const busRoutes = [
  {
    name: 'S12D',
    stops: ['Howrah', 'Esplanade', 'Park Street', 'Gariahat', 'Jadavpur'],
  },
  {
    name: 'AC6',
    stops: ['Ultadanga', 'Shyambazar', 'Esplanade', 'Rashbehari', 'Tollygunge'],
  },
  {
    name: '12C',
    stops: ['Howrah', 'Rabindra Sadan', 'Kalighat', 'Tollygunge', 'Garia'],
  },
  {
    name: 'S9A',
    stops: ['Dunlop', 'Shyambazar', 'Sealdah', 'Park Circus', 'Gariahat', 'Garia'],
  },
  {
    name: '205',
    stops: ['Barasat', 'Ultadanga', 'Sealdah', 'Park Street', 'Esplanade'],
  },
  // New routes with the added stops
  {
    name: 'AC12D',
    stops: ['Howrah', 'Esplanade', 'Park Street', 'Chingrighata', 'Newtown', 'Sapoorji'],
  },
  {
    name: 'S30',
    stops: ['Ultadanga', 'Chingrighata', 'Newtown', 'Sector V', 'Sapoorji'],
  },
  {
    name: 'VS1',
    stops: ['Howrah', 'Esplanade', 'Chingrighata', 'Sector V'],
  },
  {
    name: '12C/1B',
    stops: ['Garia', 'Gariahat', 'Chingrighata', 'Newtown', 'Sapoorji'],
  },
  {
    name: 'AC23A',
    stops: ['Barasat', 'Ultadanga', 'Chingrighata', 'Newtown', 'Sector V', 'Sapoorji'],
  },
]; 