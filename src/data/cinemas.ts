export type Cinema = {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  isIMAX: boolean;
  format?: string;
  lat: number;
  lng: number;
  address?: string;
  zipCode?: string;
};


export const cinemas: Cinema[] = [
  { id: "amc-lincoln-square", name: "AMC Lincoln Square", city: "New York", state: "NY", country: "USA", isIMAX: true, lat: 40.774233, lng: -73.982253 },
  { id: "tcl-chinese-theatres", name: "TCL Chinese Theatres", city: "Los Angeles", state: "CA", country: "USA", isIMAX: true, lat: 34.102021, lng: -118.34094 },
  { id: "regal-edwards-ontario-palace", name: "Regal Edwards Ontario Palace Stadium", city: "Los Angeles", state: "CA", country: "USA", isIMAX: true, lat: 34.0703, lng: -117.5898 },
  { id: "regal-irvine-spectrum", name: "Regal Irvine Spectrum", city: "Los Angeles", state: "CA", country: "USA", isIMAX: true, lat: 33.6595, lng: -117.7431 },
  { id: "universal-citywalk-amc", name: "Universal Cinema AMC at CityWalk Hollywood", city: "Los Angeles", state: "CA", country: "USA", isIMAX: true, lat: 34.1381, lng: -118.3534 },
  { id: "esquire-imax", name: "Esquire IMAX", city: "Sacramento", state: "CA", country: "USA", isIMAX: true, lat: 38.5816, lng: -121.4944 },
  { id: "amc-metreon", name: "AMC Metreon", city: "San Francisco", state: "CA", country: "USA", isIMAX: true, lat: 37.7841, lng: -122.4039 },
  { id: "regal-hacienda-crossings", name: "Regal Hacienda Crossings", city: "San Francisco", state: "CA", country: "USA", isIMAX: true, lat: 37.7036, lng: -121.9258 },
  { id: "regal-mall-of-georgia", name: "Regal Mall of Georgia", city: "Atlanta", state: "GA", country: "USA", isIMAX: true, lat: 34.0635, lng: -83.9821 },
  { id: "imax-indiana-state-museum", name: "IMAX Theatre at Indiana State Museum", city: "Indianapolis", state: "IN", country: "USA", isIMAX: true, lat: 39.7684, lng: -86.1752 },
  { id: "celebration-gr-north", name: "Celebration Cinema GR North", city: "Grand Rapids", state: "MI", country: "USA", isIMAX: true, lat: 43.0315, lng: -85.6681 },
  { id: "regal-ua-king-of-prussia", name: "Regal UA King of Prussia", city: "Philadelphia", state: "PA", country: "USA", isIMAX: true, lat: 40.0905, lng: -75.3937 },
  { id: "regal-opry-mills", name: "Regal Opry Mills", city: "Nashville", state: "TN", country: "USA", isIMAX: true, lat: 36.2068, lng: -86.6916 },
  { id: "cinemark-dallas-imax", name: "Cinemark Dallas IMAX", city: "Dallas", state: "TX", country: "USA", isIMAX: true, lat: 32.7767, lng: -96.797 },
  { id: "bfi-imax", name: "BFI IMAX", city: "London", state: "England", country: "United Kingdom", isIMAX: true, format: "IMAX 70mm", lat: 51.5055, lng: -0.1132 },
  { id: "science-museum-imax", name: "Science Museum IMAX", city: "London", state: "England", country: "United Kingdom", isIMAX: true, format: "IMAX 70mm", lat: 51.4978, lng: -0.1745 },
  { id: "cinema-city-imax-prague", name: "Cinema City IMAX Prague", city: "Prague", state: "Prague", country: "Czech Republic", isIMAX: true, format: "IMAX 70mm", lat: 50.0755, lng: 14.4378 }
];