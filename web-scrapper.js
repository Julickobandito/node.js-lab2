const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const http = require('http');


const newsList = [];

const getNews = function() {
    fetch('https://www.npr.org/sections/strange-news/')
        .then(response => {
            if (response.ok) {
                return response.text();
            } else {
                console.log(`Request failed with status ${response.status}`);
                throw new Error('Request failed');
            }
        })
        .then(html => {
            const $ = cheerio.load(html);
            const newsItems = $('article.item');

            newsItems.each((i, item) => {
                const title = $(item).find('h2.title').text().trim();
                const date = $(item).find('time').text().split('•')[0].trim();
                const storyType = $(item).find('h3.slug').text().trim();
                const summary = $(item).find('p.teaser').text().split('•').pop().trim();
                const link = $(item).find('a').attr('href');
                const id = i+1;
                const newsItem = {id, title, date, storyType, summary, link};
                if (!newsList.find(item => item.id === id)) {
                    newsList.push(newsItem);
                    console.log('New item added:', newsItem);
                }
            });

            newsList.forEach((news, index) => {
                const fileName = `news${index+1}.json`;
                const filePath = path.join('news', fileName);
                if (!fs.existsSync(filePath)) {
                    const data = JSON.stringify(news);
                    fs.writeFile(filePath, data, (err) => {
                        if (err) throw err;
                        console.log(`File ${fileName} has been saved`);
                    });
                }
            });
        })
        .catch(error => {
            console.log(`Request failed: ${error}`);
        });
}

getNews();
setInterval(getNews, 60000);
console.log("NewsList",newsList);

const server = http.createServer((req, res) => {
    const url = req.url;

    if (url === '/news') {
        // read the list of news files from the news directory
        fs.readdir('news', (err, files) => {
            if (err) {
                res.statusCode = 500;
                res.end('Internal server error');
            } else {
                // generate a list of links to the news files
                const links = files.map(file => `<li><a href="/news/${file}">${file}</a></li>`);
                const html = `
                    <html>
                        <head>
                            <style>
                                @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap');
                                h1 {text-align: center; font-size: 26px;}
                                .news-list {   
                                    font-size: 20px;                     
                                    border: 1px solid #e0e0e0;
                                    padding: 20px;
                                    border-radius: 10px;
                                    background: #e0e0e0;
                                    width: 30%;
                                    font-family: 'Lora', serif;
                                }
                                .news-list ul li {list-style-type: none;}
                                a {text-decoration: none;}
                                #stats {border: 1px solid #707070; background-color: #707070; color: white; 
                                padding: 20px; width: 200px; display: block; text-align: center; height: 20px;
                                border-radius: 10px;}
                                #stats:hover {
                                    background: #3b3b3b; transition: 0.3s;
                                }
                                .flex {
                                    display: flex;
                                    justify-content: space-between;
                                    width: 60%;
                                    margin: 2% auto auto auto;
                                    align-items: center;
                                }
                            </style>
                        </head>
                        <body>
                            <h1>List of news files scrapped from the website: 
                                <a href="https://www.npr.org/sections/strange-news/">https://www.npr.org/sections/strange-news/</a>
                            </h1>
                            <div class="flex">
                                <div class="news-list">
                                    <ul>${sortAsc(links).join('')}</ul>
                                </div>
                                <a id="stats" href="/news/stats">News details</a>
                            </div>
                        </body>
                    </html>`;

                res.setHeader('Content-Type', 'text/html');
                res.end(html);
            }
        });

    } else if (url.startsWith('/news/news')) {
        // check if the request URL is for a specific news file
        const fileName = url.slice(6); // remove '/news/' from the beginning of the URL
        const filePath = path.join('news', fileName);
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                res.statusCode = 404;
                res.end('File not found');
            } else {
                // send the contents of the news file as the response
                const file = {title, summary, link, date} = JSON.parse(data);
                const html = `
            <html>
                <head>
                    <style>
                    @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap');
                    h1 {text-align: center; font-size: 28px;}
                    .news-wrapper {
                        border: 1px solid #e0e0e0;
                        padding: 20px;
                        border-radius: 10px;
                        background: #e0e0e0;
                        margin: 5% auto;
                        width: 70%;
                        font-family: 'Lora', serif;
                    }
                    .news-wrapper__flex {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    </style>
                </head>
                <body>
                    <div class="news-wrapper">
                        <h1>${file.title}</h1>
                        <div class="news-wrapper__flex">
                            <i>${file.date}</i>
                            <p><a href="/news">Back to the list</a></p>
                        </div>
                        <p>${file.summary}</p>
                        <p><a href="${file.link}">Read the whole article here</a></p>
                    </div>
                </body>
            </html>
                `;
                res.setHeader('Content-Type', 'text/html');
                res.end(html);
            }
        });
    }

    else if (url === '/news/stats') {
        // read the list of news files from the news directory
        fs.readdir('news', (err, files) => {
            if (err) {
                res.statusCode = 500;
                res.end('Internal server error');
            } else {
                // filter out non-news files
                const newsFiles = files.filter(file => file.startsWith('news'));

                if (url === '/news/stats') {
                    // generate a table with news file information
                    const rows = newsFiles.map((file) => {
                        const filePath = path.join('news', file);
                        const data = fs.readFileSync(filePath, 'utf8');
                        const {id, title, storyType, date, link} = JSON.parse(data);
                        return `
                        <tr>
                            <td>${id}</td>
                            <td><a href="/news/${file}">${title.slice(0, 50)}${link.length > 30 ? '...' : ''}</a></td>
                            <td>${date}</td>
                            <td>${storyType}</td>
                            <td><a href="${link}">${link.slice(0, 30)}${link.length > 30 ? '...' : ''}</a></td>
                        </tr>
                    `;
                    })


                    const table = `
                    <html>
                        <head>
                            <style>

                                @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap');
                                h1 {text-align: center; font-size: 26px;}
                                table {   
                                    font-size: 20px;                     
                                    padding: 20px;
                                    border-radius: 10px;
                                    background: #e0e0e0;
                                    margin: 2% auto auto auto;
                                    width: 90%;
                                    font-family: 'Lora', serif;
                                    border-collapse: collapse;
                                }
                                td {
                                    text-align: center; 
                                }
                                tr {
                                    border-bottom: 1px solid #cccccc;
                                }
                                tr:last-child {
                                    border-bottom: none;
                                }
                                tr:hover {
                                    background-color: #ececec;
                                    transition: 0.2s;
                                }
                                tr, td {
                                    padding: 10px;
                                }
                                a {
                                    text-decoration: none;
                                }
                                .flex { display: flex; justify-content: space-between; align-items: center; width: 90%; margin: 20px auto;}
                  
                            </style>
                        </head>
                        <body>
                            <div class="flex">
                                <h1>Statistics of news files scrapped from the: 
                                    <a href="https://www.npr.org/sections/strange-news/">website</a>
                                </h1>
                                <p><a href="/news">Back to the list</a></p>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Title</th>
                                        <th>Date</th>
                                        <th>News Type</th>
                                        <th>Link</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sortAsc(rows).join('')};
                                </tbody>
                            </table>
                        </body>
                    </html>`;

                    res.setHeader('Content-Type', 'text/html');
                    res.end(table);

                }
            }
        });
    }

    else {
        // handle all other requests with a 404 error
        res.statusCode = 404;
        res.end('Not found');
    }
});

const sortAsc = function (arr) {
arr.sort(function(a, b) {
        const aNum = parseInt(a.match(/\d+/)[0]);
        const bNum = parseInt(b.match(/\d+/)[0]);
        return aNum - bNum;
    });
    return arr;
}

server.listen(8080, () => {
    console.log('Server is listening on http://localhost:8080/');
});

