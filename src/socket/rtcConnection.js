let userJoin = {};

const rtcConnection = (socket, io) => {
  console.log('A user connected');
  socket.on('rtc_connection', (data) => {
    console.log('RTC connection data:', data);
  });
};

export default rtcConnection;