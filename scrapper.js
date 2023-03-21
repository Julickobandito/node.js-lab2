import fetch from 'node-fetch';
import cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
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
                const id = i + 1;
                const newsItem = {id, title, date, storyType, summary, link};
                if (!newsList.find(item => item.id === id)) {
                    newsList.push(newsItem);
                    console.log('New item added:', newsItem);
                }
            });

            newsList.forEach((news, index) => {
                const fileName = `news${index + 1}.json`;
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

export {newsList, getNews};