// ============================================
// LIBRARY MANAGEMENT SYSTEM
// ============================================

// Load data from localStorage
let books = JSON.parse(localStorage.getItem("libraryBooks")) || [
    {
        id: "B001",
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        category: "Novel",
        quantity: 3,
        available: 3
    },
    {
        id: "B002",
        title: "Clean Code",
        author: "Robert C. Martin",
        category: "Programming",
        quantity: 2,
        available: 2
    },
    {
        id: "B003",
        title: "Atomic Habits",
        author: "James Clear",
        category: "Self Help",
        quantity: 4,
        available: 4
    }
];

let issuedBooks =
    JSON.parse(localStorage.getItem("issuedBooks")) || [];

let waitingQueue =
    JSON.parse(localStorage.getItem("waitingQueue")) || [];


// ============================================
// SAVE DATA
// ============================================

function saveData() {
    localStorage.setItem(
        "libraryBooks",
        JSON.stringify(books)
    );

    localStorage.setItem(
        "issuedBooks",
        JSON.stringify(issuedBooks)
    );

    localStorage.setItem(
        "waitingQueue",
        JSON.stringify(waitingQueue)
    );
}


// ============================================
// ADD BOOK
// ============================================

document
    .getElementById("bookForm")
    .addEventListener("submit", function(event) {

        event.preventDefault();

        const id = document
            .getElementById("bookId")
            .value
            .trim();

        const title = document
            .getElementById("title")
            .value
            .trim();

        const author = document
            .getElementById("author")
            .value
            .trim();

        const category = document
            .getElementById("category")
            .value
            .trim();

        const quantity = parseInt(
            document.getElementById("quantity").value
        );

        // Check duplicate ID
        const existingBook = books.find(
            book => book.id.toLowerCase() === id.toLowerCase()
        );

        if (existingBook) {
            alert("A book with this ID already exists.");
            return;
        }

        const newBook = {
            id,
            title,
            author,
            category,
            quantity,
            available: quantity
        };

        books.push(newBook);

        saveData();

        this.reset();

        document.getElementById("quantity").value = 1;

        renderAll();

        alert("Book added successfully!");
    });


// ============================================
// DISPLAY BOOKS
// ============================================

function displayBooks() {

    const tbody =
        document.getElementById("bookTableBody");

    const searchText =
        document.getElementById("searchInput")
        .value
        .toLowerCase();

    const filter =
        document.getElementById("filterSelect").value;

    const sortBy =
        document.getElementById("sortSelect").value;

    let filteredBooks = books.filter(book => {

        const matchesSearch =
            book.id.toLowerCase().includes(searchText) ||
            book.title.toLowerCase().includes(searchText) ||
            book.author.toLowerCase().includes(searchText) ||
            book.category.toLowerCase().includes(searchText);

        let matchesFilter = true;

        if (filter === "available") {
            matchesFilter = book.available > 0;
        }

        if (filter === "issued") {
            matchesFilter =
                book.available < book.quantity;
        }

        return matchesSearch && matchesFilter;
    });


    // Sort books

    filteredBooks.sort((a, b) => {

        if (sortBy === "title") {
            return a.title.localeCompare(b.title);
        }

        if (sortBy === "author") {
            return a.author.localeCompare(b.author);
        }

        if (sortBy === "available") {
            return b.available - a.available;
        }

        return 0;
    });


    tbody.innerHTML = "";

    if (filteredBooks.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    No books found.
                </td>
            </tr>
        `;

        return;
    }


    filteredBooks.forEach(book => {

        const queueCount =
            waitingQueue.filter(
                request => request.bookId === book.id
            ).length;

        const availabilityClass =
            book.available > 0
                ? "available"
                : "unavailable";

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${book.id}</td>

            <td>
                <strong>${escapeHTML(book.title)}</strong>
            </td>

            <td>${escapeHTML(book.author)}</td>

            <td>${escapeHTML(book.category)}</td>

            <td>${book.quantity}</td>

            <td class="${availabilityClass}">
                ${book.available}
            </td>

            <td>${queueCount}</td>

            <td>

                ${
                    book.available > 0
                    ?
                    `<button
                        class="btn success"
                        onclick="openIssueModal('${book.id}')">
                        Issue
                    </button>`
                    :
                    `<button
                        class="btn warning"
                        onclick="addToQueue('${book.id}')">
                        Join Queue
                    </button>`
                }

                <button
                    class="btn danger"
                    onclick="deleteBook('${book.id}')">
                    Delete
                </button>

            </td>
        `;

        tbody.appendChild(row);
    });
}


// ============================================
// ISSUE BOOK
// ============================================

function openIssueModal(bookId) {

    const book = books.find(
        book => book.id === bookId
    );

    if (!book) return;

    if (book.available <= 0) {
        alert("No copies are currently available.");
        addToQueue(bookId);
        return;
    }

    document.getElementById("issueBookId").value =
        bookId;

    document.getElementById("issueBookName").textContent =
        `Book: ${book.title}`;

    document.getElementById("borrowerName").value = "";

    document.getElementById("issueModal").style.display =
        "block";
}


function closeModal() {

    document.getElementById("issueModal").style.display =
        "none";
}


function confirmIssue() {

    const bookId =
        document.getElementById("issueBookId").value;

    const borrower =
        document.getElementById("borrowerName")
        .value
        .trim();

    if (!borrower) {
        alert("Please enter borrower name.");
        return;
    }

    const book = books.find(
        book => book.id === bookId
    );

    if (!book || book.available <= 0) {
        alert("Book is not available.");
        closeModal();
        return;
    }

    book.available--;

    const issueRecord = {

        id: Date.now(),

        bookId: book.id,

        bookTitle: book.title,

        borrower: borrower,

        issueDate: new Date().toLocaleDateString()

    };

    issuedBooks.push(issueRecord);

    saveData();

    closeModal();

    renderAll();

    alert("Book issued successfully!");
}


// ============================================
// RETURN BOOK
// ============================================

function returnBook(issueId) {

    const index = issuedBooks.findIndex(
        record => record.id === issueId
    );

    if (index === -1) return;

    const record = issuedBooks[index];

    const book = books.find(
        book => book.id === record.bookId
    );

    if (book) {

        book.available++;

        // Check waiting queue
        const queueIndex =
            waitingQueue.findIndex(
                request => request.bookId === book.id
            );

        if (queueIndex !== -1) {

            const nextPerson =
                waitingQueue[queueIndex];

            alert(
                `${nextPerson.name} is next in the waiting queue for "${book.title}".`
            );
        }
    }

    issuedBooks.splice(index, 1);

    saveData();

    renderAll();
}


// ============================================
// ISSUED BOOKS DISPLAY
// ============================================

function displayIssuedBooks() {

    const tbody =
        document.getElementById("issuedTableBody");

    tbody.innerHTML = "";

    if (issuedBooks.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty">
                    No books are currently issued.
                </td>
            </tr>
        `;

        return;
    }


    issuedBooks.forEach(record