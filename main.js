import {getNews} from './scrapper.js';
import server from "./server.js";

// call functions
getNews();
setInterval(getNews, 60000);


// link server to port 8080
server.listen(8080, () => {
    console.log('Server is listening on http://localhost:8080/');
});

