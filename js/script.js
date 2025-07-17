// js/script.js

document.addEventListener('DOMContentLoaded', () => {

    // --- Elemen DOM ---
    const mainHeader = document.getElementById('main-header');
    const banner = document.getElementById('banner'); // Ini adalah container banner utama
    const cardGrid = document.getElementById('card-grid');
    const showPerPageSelect = document.getElementById('show-per-page');
    const sortBySelect = document.getElementById('sort-by');
    const paginationContainer = document.querySelector('.pagination');
    const currentStartSpan = document.getElementById('current-start');
    const currentEndSpan = document.getElementById('current-end');
    const totalItemsSpan = document.getElementById('total-items');

    // Pastikan selektor ini benar berdasarkan struktur HTML Anda
    const bannerImageElement = document.querySelector('#banner .banner-image'); // Memilih div dengan gambar latar belakang
    const bannerTitle = document.querySelector('#banner .banner-content h1');
    const bannerSubtitle = document.querySelector('#banner .banner-content p');


    // --- Konfigurasi API ---
    const API_BASE_URL = 'https://suitmedia-backend.suitdev.com/api/ideas';
    const CMS_CONFIG_URL = 'config.json'; // Jalur ke file config.json Anda


    /**
     * Memuat konfigurasi banner dari config.json dan menerapkannya ke elemen banner.
     */
    async function loadBannerConfig() {
        try {
            const response = await fetch(CMS_CONFIG_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const { banner: bannerConfig } = await response.json(); // Destrukturisasi untuk mendapatkan objek banner dan ganti nama untuk menghindari konflik

            // Terapkan pengaturan CMS
            if (bannerConfig.image_url && bannerImageElement) {
                bannerImageElement.style.backgroundImage = `url(${bannerConfig.image_url})`;
            }
            if (bannerConfig.title && bannerTitle) {
                bannerTitle.textContent = bannerConfig.title;
            }
            if (bannerConfig.subtitle && bannerSubtitle) {
                bannerSubtitle.textContent = bannerConfig.subtitle;
            }
        } catch (error) {
            console.error("Gagal memuat konfigurasi banner:", error);
        }
    }


    // --- Manajemen State ---
    let currentPage = parseInt(localStorage.getItem('currentPage')) || 1;
    let itemsPerPage = parseInt(localStorage.getItem('itemsPerPage')) || 10;
    let sortBy = localStorage.getItem('sortBy') || '-published_at';

    // Set nilai awal dropdown berdasarkan localStorage
    showPerPageSelect.value = itemsPerPage;
    sortBySelect.value = sortBy;


    // --- Logika Scroll Header ---
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > lastScrollY && currentScrollY > 70) {
            mainHeader.classList.add('hidden');
        } else {
            mainHeader.classList.remove('hidden');
        }

        if (currentScrollY > 0) {
            mainHeader.classList.add('scrolled');
        } else {
            mainHeader.classList.remove('scrolled');
        }

        lastScrollY = currentScrollY;

        // Efek Parallax untuk Banner
        const scrollPosition = window.scrollY;
        
        if (bannerImageElement) {
            bannerImageElement.style.transform = `translateY(${scrollPosition * 0.3}px)`;
        }
        // Pastikan bannerContent sudah didefinisikan atau di-query di sini
        const bannerContentElement = document.querySelector('#banner .banner-content'); 
        if (bannerContentElement) {
            bannerContentElement.style.transform = `translateY(${scrollPosition * 0.1}px)`;
        }
    });


    // --- Fungsi Pengambilan API ---
    async function fetchIdeas(page, size, sortOrder) {
        const API_URL = `${API_BASE_URL}?page[number]=${page}&page[size]=${size}&append[]=small_image&append[]=medium_image&sort=${sortOrder}`;

        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Gagal mengambil ide:", error);
            return { data: [], meta: { total: 0, current_page: 1, last_page: 1, from: 0, to: 0, per_page: itemsPerPage } };
        }
    }


    // --- Render Kartu ---
    function renderCards(posts) {
        cardGrid.innerHTML = '';
        if (posts.length === 0) {
            cardGrid.innerHTML = '<p style="text-align: center; width: 100%;">Tidak ada ide yang ditemukan.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();
        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'card';

            let imageUrl = '';
            if (post.small_image && Array.isArray(post.small_image) && post.small_image.length > 0) {
                imageUrl = post.small_image[0].url;
            } else if (post.medium_image && Array.isArray(post.medium_image) && post.medium_image.length > 0) {
                imageUrl = post.medium_image[0].url;
            }

            if (!imageUrl) {
                // Gunakan placeholder yang lebih generik atau sesuai branding Anda
                imageUrl = 'https://via.placeholder.com/400x250/f0f0f0/aaa?text=Tidak+Ada+Gambar';
            }

            const publishedDate = new Date(post.published_at);
            const formattedDate = publishedDate.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            card.innerHTML = `
                <div class="card-thumbnail">
                  <img src="https://picsum.photos/400/250?random=${post.id}" alt="${post.title}" loading="lazy">
                </div>
                <div class="card-content">
                    <p class="card-date">${formattedDate}</p>
                    <h3 class="card-title">${post.title}</h3>
                </div>
            `;
            fragment.appendChild(card);
        });
        cardGrid.appendChild(fragment);
    }


    /**
     * Merender kontrol paginasi.
     * @param {Object} meta - Data meta dari respons API.
     */
    function renderPagination(meta) {
        const totalItems = meta.total;
        const totalPages = meta.last_page;
        const currentPage = meta.current_page;
        const pageRange = 2;
        const boundaryPages = 1;

        paginationContainer.innerHTML = '';

        const firstPageBtn = createPaginationElement('a', 'pagination-link', '&laquo;', 1, true);
        if (currentPage === 1) firstPageBtn.classList.add('disabled');
        paginationContainer.appendChild(firstPageBtn);

        const prevPageBtn = createPaginationElement('a', 'pagination-link', '&lsaquo;', currentPage - 1, true);
        if (currentPage === 1) prevPageBtn.classList.add('disabled');
        paginationContainer.appendChild(prevPageBtn);

        const pagesToRender = new Set();
        for (let i = 1; i <= boundaryPages; i++) {
            if (i <= totalPages) pagesToRender.add(i);
        }
        for (let i = currentPage - pageRange; i <= currentPage + pageRange; i++) {
            if (i > 0 && i <= totalPages) pagesToRender.add(i);
        }
        for (let i = totalPages - boundaryPages + 1; i <= totalPages; i++) {
            if (i > 0 && i <= totalPages) pagesToRender.add(i);
        }

        const sortedPages = Array.from(pagesToRender).sort((a, b) => a - b);

        let lastPageAdded = 0;
        sortedPages.forEach(pageNum => {
            if (pageNum > lastPageAdded + 1) {
                paginationContainer.appendChild(createPaginationElement('span', 'ellipsis', '...', null, true));
            }
            paginationContainer.appendChild(createPaginationLinkElement(pageNum, currentPage));
            lastPageAdded = pageNum;
        });

        const nextPageBtn = createPaginationElement('a', 'pagination-link', '&rsaquo;', currentPage + 1, true);
        if (currentPage === totalPages) nextPageBtn.classList.add('disabled');
        paginationContainer.appendChild(nextPageBtn);

        const lastPageBtn = createPaginationElement('a', 'pagination-link', '&raquo;', totalPages, true);
        if (currentPage === totalPages) lastPageBtn.classList.add('disabled');
        paginationContainer.appendChild(lastPageBtn);

        updateShowingInfo(meta);
    }

    /**
     * Fungsi pembantu untuk membuat elemen paginasi generik (span atau a).
     */
    function createPaginationElement(tag, className, content, pageNumber = null, isHTML = false) {
        const el = document.createElement(tag);
        el.className = className;
        if (isHTML) {
            el.innerHTML = content;
        } else {
            el.textContent = content;
        }

        if (tag === 'a' && pageNumber !== null) {
            el.href = "#";
            el.dataset.page = pageNumber;
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPage = parseInt(e.currentTarget.dataset.page);
                if (!el.classList.contains('disabled')) {
                    setPage(targetPage);
                }
            });
        }
        return el;
    }

    /**
     * Fungsi pembantu untuk membuat elemen tautan paginasi khusus untuk nomor halaman.
     */
    function createPaginationLinkElement(pageNumber, activePage) {
        const link = createPaginationElement('a', 'pagination-link', pageNumber.toString(), pageNumber, false);
        if (pageNumber === activePage) {
            link.classList.add('active');
        }
        return link;
    }

    /**
     * Memperbarui teks "Menampilkan X - Y dari Z".
     */
    function updateShowingInfo(meta) {
        const totalItems = meta.total;
        const startItem = meta.from || (meta.current_page - 1) * meta.per_page + 1;
        const endItem = meta.to || Math.min(meta.current_page * meta.per_page, totalItems);

        currentStartSpan.textContent = startItem;
        currentEndSpan.textContent = endItem;
        totalItemsSpan.textContent = totalItems;
    }

    /**
     * Mengatur halaman saat ini dan memuat ulang ide.
     * @param {number} newPage - Nomor halaman baru untuk dinavigasi.
     */
    async function setPage(newPage) {
        // Penting: Validasi totalPages hanya dilakukan jika perlu.
        // Untuk paginasi, kita akan selalu mencoba fetch dan membiarkan API handle jika pageNumber terlalu besar.
        // Untuk perubahan filter (itemsPerPage, sortBy), kita akan reset ke halaman 1, jadi tidak perlu validasi totalPages di sini.

        // Jika newPage sama dengan currentPage, kita bisa keluar
        // KECUALI jika kita tahu ini dipicu oleh perubahan filter,
        // dalam hal ini, loadIdeas() harus tetap dipanggil.
        if (newPage === currentPage) {
            // Ini bisa terjadi jika klik tombol paginasi '1' dan sudah di halaman 1,
            // atau jika setPage(1) dipanggil setelah perubahan filter tapi sudah di halaman 1.
            // Untuk kasus terakhir, kita ingin loadIdeas() tetap berjalan.
            // Solusinya: Hapus validasi ini atau buat loadIdeas() terpisah.
            // Untuk kasus ini, kita biarkan saja agar loadIdeas() selalu terpanggil.
        }

        currentPage = newPage;
        localStorage.setItem('currentPage', currentPage);
        await loadIdeas(); // Pastikan loadIdeas menunggu hingga selesai
    }

    // --- Fungsi Muat Utama ---
    async function loadIdeas() {
        // Tambahkan kelas loading saat mulai memuat
        cardGrid.classList.add('is-loading');
        paginationContainer.classList.add('is-loading');

        try {
            const data = await fetchIdeas(currentPage, itemsPerPage, sortBy);
            const ideas = data.data;

            renderCards(ideas);
            renderPagination(data.meta);
        } catch (error) {
            console.error("Kesalahan saat memuat ide:", error);
            cardGrid.innerHTML = '<p style="text-align: center; width: 100%; margin-top: 50px; color: red;">Gagal memuat ide. Silakan coba lagi.</p>';
            paginationContainer.innerHTML = '';
        } finally {
            // Hapus kelas loading setelah selesai memuat
            cardGrid.classList.remove('is-loading');
            paginationContainer.classList.remove('is-loading');
        }
    }


    // --- Event Listener untuk Kontrol ---
    showPerPageSelect.addEventListener('change', (e) => {
        const newItemsPerPage = parseInt(e.target.value);
        if (newItemsPerPage !== itemsPerPage) { // Hanya update jika nilainya berubah
            itemsPerPage = newItemsPerPage;
            localStorage.setItem('itemsPerPage', itemsPerPage);
            currentPage = 1; // RESET ke halaman 1 setiap kali items per page berubah
            localStorage.setItem('currentPage', currentPage);
            loadIdeas(); // Langsung panggil loadIdeas untuk memuat data baru
        }
    });

    sortBySelect.addEventListener('change', (e) => {
        const newSortBy = e.target.value;
        if (newSortBy !== sortBy) { // Hanya update jika nilainya berubah
            sortBy = newSortBy;
            localStorage.setItem('sortBy', sortBy);
            currentPage = 1; // RESET ke halaman 1 setiap kali sortir berubah
            localStorage.setItem('currentPage', currentPage);
            loadIdeas(); // Langsung panggil loadIdeas untuk memuat data baru
        }
    });


    // --- Logika Tautan Navbar Aktif (untuk satu halaman) ---
    const navLinksList = document.querySelectorAll('.nav-links li');
    navLinksList.forEach(li => {
        const linkText = li.textContent.toLowerCase().trim();
        if (linkText === 'ideas') {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }
    });

    // Pemuatan awal konfigurasi banner dan ide saat halaman dimuat
    loadBannerConfig();
    loadIdeas(); // Panggil ini sekali saat DOMContentLoaded
});