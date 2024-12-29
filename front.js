// Mendapatkan parameter ID dari URL
const urlParams = new URLSearchParams(window.location.search);
const newsId = urlParams.get('news');

// Elemen untuk menampilkan daftar berita dan detail berita
const newsList = document.getElementById('news-list');
const newsContainer = document.getElementById('news');
const newsTitle = document.getElementById('news-title');
const newsImage = document.getElementById('news-image');
const newsDescription = document.getElementById('news-description');
const newsAuthor = document.getElementById('news-author');
const newsPublisher = document.getElementById('news-publisher');
const newsPublishedDate = document.getElementById('news-published_date');
const newsContent = document.getElementById('news-content');
const newsKeywords = document.getElementById('news-keywords');
const relatedNewsList = document.getElementById('related-news-list');

// Ganti URL API untuk development
const API_BASE_URL = 'https://api.begonoaja.site/api'; // sesuaikan port

// Fungsi untuk memperbarui meta tag dan title
function updateMetaAndTitle(newsData) {
  const head = document.head;
  const firstStyleTag = head.querySelector("style");

  // Helper function to create or update a meta or link tag and insert it before <style>
  function createOrUpdateMetaTag(name, property, content) {
    let tag = document.querySelector(name ? `meta[name="${name}"]` : `meta[property="${property}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      if (name) tag.name = name;
      if (property) tag.setAttribute("property", property);
      if (firstStyleTag) head.insertBefore(tag, firstStyleTag);
      else head.appendChild(tag);
    }
    tag.content = content;
  }

  // Helper function to create or update a link tag and insert it before <style>
  function createOrUpdateLinkTag(rel, href) {
    let linkTag = document.querySelector(`link[rel="${rel}"]`);
    if (!linkTag) {
      linkTag = document.createElement("link");
      linkTag.rel = rel;
      if (firstStyleTag) head.insertBefore(linkTag, firstStyleTag);
      else head.appendChild(linkTag);
    }
    linkTag.href = href;
  }

  // Update title
  document.title = newsData.title || "News Article";

  // Add/update meta tags
  createOrUpdateMetaTag("description", null, newsData.description || "Read the latest news update.");
  createOrUpdateMetaTag(null, "og:title", newsData.title);
  createOrUpdateMetaTag(null, "og:description", newsData.description || "Read the latest news update.");
  createOrUpdateMetaTag(null, "og:url", window.location.href);
  createOrUpdateMetaTag(null, "og:image", newsData.top_image || "default-image.jpg");
  createOrUpdateMetaTag("twitter:card", null, "summary_large_image");
  createOrUpdateMetaTag("twitter:title", null, newsData.title);
  createOrUpdateMetaTag("twitter:description", null, newsData.description || "Read the latest news update.");
  createOrUpdateMetaTag("twitter:image", null, newsData.top_image || "default-image.jpg");
  createOrUpdateMetaTag("keywords", null, newsData.keywords ? newsData.keywords : "news, article");

  // Add/update canonical link
  createOrUpdateLinkTag("canonical", window.location.href);
}

// Fungsi untuk menambahkan JSON-LD schema
function addJsonLdSchema(newsData) {
  // Hapus schema yang ada sebelumnya jika ada
  const existingSchema = document.querySelector('script[type="application/ld+json"]');
  if (existingSchema) {
    existingSchema.remove();
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": newsData.title,
    "description": newsData.description,
    "image": [
      newsData.top_image
    ],
    "datePublished": formatDate(newsData.published_date),
    "dateModified": formatDate(newsData.published_date),
    "author": {
      "@type": "Person",
      "name": newsData.authors
    },
    "publisher": {
      "@type": "Organization",
      "name": newsData.publisher_title,
      "logo": {
        "@type": "ImageObject",
        "url": newsData.publisher_logo || ""
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": window.location.href
    },
    "keywords": newsData.keywords,
    "articleBody": newsData.news_text || "",
    "url": window.location.href
  };

  const scriptTag = document.createElement('script');
  scriptTag.type = 'application/ld+json';
  scriptTag.text = JSON.stringify(schema);
  document.head.appendChild(scriptTag);
}

// Fungsi untuk format tanggal
function formatDate(timestamp) {
    if (!timestamp) return 'Date not available';
    
    try {
        // Jika timestamp dalam miliseconds
        const date = new Date(parseInt(timestamp));
        
        // Cek apakah tanggal valid
        if (isNaN(date.getTime())) {
            // Coba parse sebagai string date
            const stringDate = new Date(timestamp);
            if (!isNaN(stringDate.getTime())) {
                return stringDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
            return 'Invalid date';
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
    }
}

// Fungsi tunggal untuk fetch data
async function fetchData() {
    const newsId = new URLSearchParams(window.location.search).get('news');
    const requestData = {
        host: window.location.hostname + (window.location.port ? ':' + window.location.port : ''),
        search: window.location.search,
        ref: document.referrer || ''
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/news`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (data.isPage) {
            // Cek apakah data valid berdasarkan tipe response
            if (data.isBot && !data.static_html) {
                throw new Error('Invalid page data received');
            } else if (!data.isBot && !data.title) {
                throw new Error('Invalid page data received');
            }
            renderDetailPage(data);
        } else {
            if (!Array.isArray(data.news)) {
                throw new Error('Invalid news data received');
            }
            allNewsItems = data.news;
            extractTopics(data.news);
            renderCategories();
            renderHomePage(data.news);
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        const errorElement = document.getElementById(newsId ? 'news-title' : 'news-grid');
        if (errorElement) {
            errorElement.textContent = "Error loading data.";
        }
    }
}

// Fungsi untuk filter berita berdasarkan kategori
function filterNewsByCategory(category) {
    if (category === 'All') {
        renderHomePage(allNewsItems);
        return;
    }
    
    const filteredNews = allNewsItems.filter(news => {
        // Cek dari properti topic
        if (!news.topic) return false;
        
        if (typeof news.topic === 'string') {
            return news.topic.toLowerCase().includes(category.toLowerCase());
        }
        
        if (Array.isArray(news.topic)) {
            return news.topic.some(t => t.toLowerCase().includes(category.toLowerCase()));
        }
        
        return false;
    });
    
    renderHomePage(filteredNews);
}

// Fungsi untuk render homepage
function renderHomePage(newsItems) {
    if (!Array.isArray(newsItems) || newsItems.length === 0) {
        document.getElementById('news-grid').innerHTML = '<div class="no-news">No news available for this category</div>';
        return;
    }

    // Pastikan setiap item memiliki published_date sebelum sorting
    const sortableItems = newsItems.filter(item => item && item.published_date);
    
    // Sort news by date jika ada published_date
    if (sortableItems.length > 0) {
        sortableItems.sort((a, b) => b.published_date - a.published_date);
    }

    // Gunakan array yang sudah disort atau array original jika tidak bisa disort
    const itemsToRender = sortableItems.length > 0 ? sortableItems : newsItems;

    // Clear dan append semua konten baru
    const newsGrid = document.getElementById('news-grid');
    newsGrid.innerHTML = '';

    // Render artikel
    itemsToRender.forEach(newsItem => {
        const newsDiv = document.createElement('div');
        newsDiv.classList.add('news-item');
        newsDiv.innerHTML = `
            <img src="${newsItem.top_image || ''}" alt="${newsItem.title}">
            <div class="news-info">
                <h2 class="title"><a href="?news=${newsItem.id}">${newsItem.title}</a></h2>
                <div class="description">${newsItem.description || ''}</div>
                <div class="news-meta">
                    <span><i class="far fa-clock"></i> ${formatDate(newsItem.published_date)}</span>
                    <span><i class="far fa-newspaper"></i> ${newsItem.publisher_title || 'Unknown'}</span>
                </div>
            </div>
        `;
        document.getElementById('news-grid').appendChild(newsDiv);
    });
}

// Fungsi untuk render detail page
function renderDetailPage(data) {
    if (data.isBot) {
        // Untuk bot, tampilkan konten statis
        document.getElementById('news-grid').style.display = 'none';
        document.getElementById('news').style.display = 'block';
        
        // Hapus elemen yang tidak diperlukan untuk bot
        const elementsToRemove = [
            '.breadcrumb',
            '#news-title',
            '.post-meta',
            '#news-image',
            '#news-description',
            '#news-keywords'
        ];
        
        elementsToRemove.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.remove();
            }
        });
        
        document.getElementById('news-content').innerHTML = data.static_html;
        
        // Tambahkan meta tags
        updateMetaAndTitle(data.meta_tags);
        
        // Tambahkan structured data
        const scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        scriptTag.text = JSON.stringify(data.structured_data);
        document.head.appendChild(scriptTag);

        // Sembunyikan elemen yang tidak diperlukan untuk bot
        const elementsToHide = [
            '.share-buttons',
            '.ads-container-top',
            '.ads-container-middle',
            '.related-titles'
        ];
        
        elementsToHide.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = 'none';
            }
        });
        return; // Keluar dari fungsi setelah menangani bot
    }

    // Kode untuk user biasa di bawah ini
    document.getElementById('news-grid').style.display = 'none';
    document.getElementById('news').style.display = 'block';

    // Update breadcrumb
    const topic = data.topic || 'General';
    document.getElementById('news-topic').textContent = Array.isArray(topic) ? topic[0] : topic;

    // Render detail berita
    newsTitle.textContent = data.title || "Title not available";
    newsImage.src = data.top_image || "";
    newsImage.style.display = data.top_image ? "block" : "none";
    newsDescription.textContent = data.description || "Description not available.";
    document.querySelector('#news-author span').textContent = data.authors || 'Unknown';
    document.querySelector('#news-publisher span').textContent = data.publisher_title || 'Unknown';
    document.querySelector('#news-published_date span').textContent = formatDate(data.published_date) || "Not available";
    newsContent.innerHTML = data.news_html || "No content available";
    document.querySelector('#news-keywords span').textContent = data.keywords || "N/A";

    // Update meta dan schema
    updateMetaAndTitle(data);
    addJsonLdSchema(data);
    
    // Render related news
    if (relatedNewsList) {
        relatedNewsList.innerHTML = '';
        
        if (data.relatedNews && Array.isArray(data.relatedNews)) {
            data.relatedNews.forEach((item) => {
                if (!item) return; // Skip invalid items
                
                const relatedDiv = document.createElement('div');
                relatedDiv.classList.add('news-item');
                
                let url = item.url ? `${item.url}?news=${item.id}` : `?news=${item.id}`;
                relatedDiv.innerHTML = `
                    <div class="related-image">
                        <img src="${item.top_image || ''}" alt="${item.title}" 
                            onerror="this.style.display='none'">
                    </div>
                    <h3 class="title">
                        <a href="${url}" target="${item.url ? '_blank' : '_self'}">
                            ${item.title || 'Untitled'}
                        </a>
                    </h3>
                    <div class="news-meta">
                        <span><i class="far fa-clock"></i> ${formatDate(item.published_date)}</span>
                    </div>
                `;
                relatedNewsList.appendChild(relatedDiv);
            });
        } else {
            relatedNewsList.innerHTML = '<p>No related news available</p>';
        }
    }

    // Tampilkan container iklan
    document.querySelectorAll('.ads-container-top, .ads-container-middle').forEach(container => {
        container.style.display = 'flex';
    });
}

// Fungsi untuk mengekstrak topics dari berita
function extractTopics(newsItems) {
    const topicsSet = new Set(['All']); // Selalu sertakan 'All'
    newsItems.forEach(news => {
        if (news.topic) {
            // Jika topic adalah string, split jika ada multiple topics
            if (typeof news.topic === 'string') {
                news.topic.split(',').forEach(t => topicsSet.add(t.trim()));
            }
            // Jika topic adalah array
            else if (Array.isArray(news.topic)) {
                news.topic.forEach(t => topicsSet.add(t));
            }
        }
    });
    availableTopics = Array.from(topicsSet);
}

// Fungsi untuk render categories di navbar
function renderCategories() {
    const navCategories = document.querySelector('.nav-categories');
    navCategories.innerHTML = availableTopics.map((topic, index) => `
        <a href="#" class="nav-category ${index === 0 ? 'active' : ''}">${topic}</a>
    `).join('');

    // Tambahkan event listeners untuk kategori
    document.querySelectorAll('.nav-category').forEach(category => {
        category.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-category').forEach(cat => {
                cat.classList.remove('active');
            });
            category.classList.add('active');
            filterNewsByCategory(category.textContent);
        });
    });
}

// Panggil fetchData saat halaman dimuat
fetchData();
