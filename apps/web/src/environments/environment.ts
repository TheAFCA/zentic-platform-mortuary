export const environment = {
  production: false,
  apiUrl: '/api',
  // Vacío = mismo origen; proxy.conf.json reenvía /socket.io a la API. Conectar
  // directo a localhost:3000 desde {slug}.localhost:4200 pierde las cookies.
  wsUrl: '',
  sentryDsn: '',
  sentryEnvironment: 'development',
};
