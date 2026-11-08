
/* =========================
   NOTE DATA
========================= */

let notes = [
    {
        id: 1,
        title: "Training Plan",
        content: "My workout schedule",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 2,
        title: "RP Ideas",
        content: "Ideas for my next story",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 3,
        title: "Project App",
        content: "Build my own application",
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

let currentNoteId = null;
const deleteNoteBtn = document.getElementById("deleteNoteBtn");
let originalContent = "";
let autoSaveTimer = null;

/* =========================
   INDEXEDDB DATABASE
========================= */

let db;

function openDatabase() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open("MyNotesDB", 1);

        request.onupgradeneeded = event => {

            const database = event.target.result;

            if (!database.objectStoreNames.contains("notes")) {

                database.createObjectStore("notes", {
                    keyPath: "id"
                });

            }
        };

        request.onsuccess = event => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });
}

/* LOAD ALL NOTES */

function loadNotes() {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction("notes", "readonly");

        const store = transaction.objectStore("notes");

        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);

        request.onerror = () => reject(request.error);

    });
}

/* SAVE ALL NOTES */

function saveNotes() {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction("notes", "readwrite");

        const store = transaction.objectStore("notes");

        store.clear();

        notes.forEach(note => {
            store.put(note);
        });

        transaction.oncomplete = () => resolve();

        transaction.onerror = () => reject(transaction.error);

        transaction.onabort = () => reject(transaction.error);

    });
}

/* =========================
   GET HTML ELEMENTS
========================= */

const notesGrid = document.getElementById("notesGrid");
const noteCount = document.getElementById("noteCount");

const editorPopup = document.getElementById("editorPopup");
const addNoteBtn = document.getElementById("addNoteBtn");

const closeEditorBtn = document.getElementById("closeEditorBtn");
const saveNoteBtn = document.getElementById("saveNoteBtn");

const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");

const editorStatus = document.getElementById("editorStatus");
const toggleToolbarBtn = document.getElementById("toggleToolbarBtn");
const editorToolbar = document.getElementById("editorToolbar");

/* =========================
   DATE FORMAT
========================= */

/**
 * @param {Date} date
 */
function formatDate(date) {
    const today = new Date(date);

    if (today.toDateString() === new Date().toDateString()) {
        return "Edited today";
    }

    return "Edited " + today.toLocaleDateString();
}

/* =========================
   DISPLAY NOTES
========================= */

function displayNotes() {

    notesGrid.innerHTML = "";

    noteCount.textContent = notes.length + " NOTES";

    notes.forEach(note => {

        const card = document.createElement("div");
        card.className = "note-card";

        const title = document.createElement("h3");
        title.textContent = note.title;

        const date = document.createElement("small");
        date.textContent = formatDate(note.updatedAt);

        card.appendChild(title);
        card.appendChild(date);

        card.addEventListener("click", () => {
            openEditor(note);
        });

        notesGrid.appendChild(card);
    });
}

/* =========================
   OPEN EDITOR
========================= */

function openEditor(note = null) {

    editorPopup.classList.add("active");

    if (note) {

        currentNoteId = note.id;

        noteTitle.value = note.title;
        noteContent.innerHTML = note.content;

        editorStatus.textContent = "Edit Note";

    } else {

        currentNoteId = null;

        noteTitle.value = "";
        noteContent.innerHTML = "";

        editorStatus.textContent = "New Note";
    }

    originalContent = noteTitle.value + "|" + noteContent.innerHTML;

    noteContent.focus();
}

/* =========================
   CLOSE EDITOR
========================= */

async function closeEditor() {

    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;

    const currentContent =
        noteTitle.value + "|" + noteContent.innerHTML;

    if (
        currentContent !== originalContent &&
        (noteTitle.value.trim() || noteContent.innerText.trim())
    ) {
        await autoSaveNote();
    }

    editorPopup.classList.remove("active");

    currentNoteId = null;
}

async function deleteNote() {

    if (currentNoteId === null) return;

    const confirmation = confirm(
        "Are you sure you want to delete this note?"
    );

    if (!confirmation) return;

    notes = notes.filter(note => note.id !== currentNoteId);

    await saveNotes();

    displayNotes();
    closeEditor();
}
/* =========================
   SAVE NOTE
========================= */

async function saveNote() {

    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  
    const title = noteTitle.value.trim();
    const content = noteContent.innerHTML;

    if (!title && !noteContent.innerText.trim()) {
        alert("Please enter a title or note content.");
        return;
    }

    if (!title) {
        alert("Please enter a note title.");
        return;
    }

    const now = new Date();

    if (currentNoteId !== null) {

        const note = notes.find(
            item => item.id === currentNoteId
        );

        if (note) {
            note.title = title;
            note.content = content;
            note.updatedAt = now;
        }

    } else {

        notes.push({
            id: Date.now(),
            title: title,
            content: content,
            createdAt: now,
            updatedAt: now
        });
    }

    try {

    await saveNotes();

    displayNotes();

    editorPopup.classList.remove("active");

    currentNoteId = null;

} catch (error) {

    alert("Failed to save note: " + error.message);

}
}

/* =========================
   autoSaveNote
========================= */

function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);

    autoSaveTimer = setTimeout(() => {
        autoSaveNote();
    }, 5000);
}

async function autoSaveNote() {

    const title = noteTitle.value.trim();
    const content = noteContent.innerHTML;

    if (!title && !noteContent.innerText.trim()) {
        return;
    }

    const now = new Date();

    if (currentNoteId !== null) {

        const note = notes.find(item => item.id === currentNoteId);

        if (note) {
            note.title = title || "Untitled";
            note.content = content;
            note.updatedAt = now;
        }

    } else {

        currentNoteId = Date.now();

        notes.push({
            id: currentNoteId,
            title: title || "Untitled",
            content: content,
            createdAt: now,
            updatedAt: now
        });
    }

    try {
        await saveNotes();

        originalContent = noteTitle.value + "|" + noteContent.innerHTML;

        editorStatus.textContent = "Auto-saved";

        displayNotes();

    } catch (error) {
        console.error("Auto-save failed:", error);
    }
}

/* =========================
   TOOLBAR FORMATTING
========================= */

// Prevent toolbar clicks from
// removing the text selection.

editorToolbar.querySelectorAll("button").forEach(button => {

    button.addEventListener("mousedown", event => {
        event.preventDefault();
    });

    button.addEventListener("click", () => {

        const command = button.dataset.command;
        const value = button.dataset.value || null;

        noteContent.focus();

        document.execCommand(command, false, value);
    });

});

/* =========================
   HIDE / SHOW TOOLBAR
========================= */

toggleToolbarBtn.addEventListener("click", () => {

    editorPopup.classList.toggle("toolbar-hidden");

});

/* =========================
   CODE CONVERTER
========================= */

function markdownToHTML(markdown) {

    let html = markdown;

    html = html.replace(/^---$/gm, "<hr>");
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    html = html.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
    html = html.replace(/\*(.*?)\*/g, "<i>$1</i>");

    html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");

    html = html.replace(/\n/g, "<br>");

    return html;
}

/* =========================
   FUNCTION IMPORT
========================= */

function importNote(file) {

    const reader = new FileReader();

    reader.onload = async function(event) {

        const content = event.target.result;

        const newNote = {
            id: Date.now(),
            title: file.name.replace(/\.(txt|md)$/i, ""),

            content: file.name.toLowerCase().endsWith(".md")
                ? markdownToHTML(content)
                : content.replace(/\n/g, "<br>"),

            createdAt: new Date(),
            updatedAt: new Date()
        };

        notes.unshift(newNote);

        await saveNotes();

        displayNotes();
    };

    reader.readAsText(file);
}

/* =========================
   FUNCTION EXPORT
========================= */

async function exportNote(format) {

    if (currentNoteId === null) return;

    const note = notes.find(note => note.id === currentNoteId);

    if (!note) return;

    const title = noteTitle.value.trim() || "Untitled";

    let output;

    if (format === "txt") {
        output = noteContent.innerText;
    } else {
        output = htmlToMarkdown(noteContent.innerHTML);
    }

    const mimeType = format === "txt"
        ? "text/plain"
        : "text/markdown";

    const blob = new Blob([output], {
        type: mimeType
    });

    const reader = new FileReader();

    reader.onload = function() {

        const base64 = reader.result.split(",")[1];

        if (window.MyNotes) {
            window.MyNotes.saveFile(
                title + "." + format,
                mimeType,
                base64
            );
        } else {
            alert("Export is not supported.");
        }
    };

    reader.readAsDataURL(blob);
}

/* =========================
   HTML TO MARKDOWN CONVERTER
========================= */

function htmlToMarkdown(html) {

    const container = document.createElement("div");
    container.innerHTML = html;

    function convert(node) {

        if (node.nodeType === 3) {
            return node.textContent;
        }

        if (node.nodeType !== 1) {
            return "";
        }

        const tag = node.tagName.toLowerCase();

        const content = Array.from(node.childNodes)
            .map(convert)
            .join("");

        switch (tag) {

            case "h1":
                return "# " + content + "\n\n";

            case "h2":
                return "## " + content + "\n\n";

            case "h3":
                return "### " + content + "\n\n";

            case "b":
            case "strong":
                return "**" + content + "**";

            case "i":
            case "em":
                return "***" + content + "***";

            case "br":
                return "\n";

            case "hr":
                return "\n---\n\n";

            case "p":
            case "div":
                return content + "\n\n";

            case "ul":
                return Array.from(node.children)
                    .map(item => "- " + convert(item).trim() + "\n")
                    .join("") + "\n";

            case "ol":
                return Array.from(node.children)
                    .map((item, index) =>
                        (index + 1) + ". " + convert(item).trim() + "\n"
                    )
                    .join("") + "\n";

            case "li":
                return content;

            case "blockquote":
                return "> " + content.trim() + "\n\n";

            case "code":
                return "`" + content + "`";

            case "pre":
                return "```\n" + content + "\n```\n\n";

            case "a":
                return "[" + content + "](" + node.href + ")";

            default:
                return content;
        }
    }

    return convert(container).trim();
}

/* =========================
   BUTTON EVENTS
========================= */

addNoteBtn.addEventListener("click", () => {
    openEditor();
});

closeEditorBtn.addEventListener("click", closeEditor);

saveNoteBtn.addEventListener("click", saveNote);

deleteNoteBtn.addEventListener("click", deleteNote);


// IMPORT BUTTONS

const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");

importBtn.addEventListener("click", () => {
    importFile.click();
});

importFile.addEventListener("change", () => {

    const file = importFile.files[0];

    if (!file) return;

    importNote(file);

    importFile.value = "";
});


// EXPORT BUTTONS

const exportTxtBtn = document.getElementById("exportTxtBtn");
const exportMdBtn = document.getElementById("exportMdBtn");

exportTxtBtn.addEventListener("click", () => {
    exportNote("txt");
});

exportMdBtn.addEventListener("click", () => {
    exportNote("md");
});

// scheduleAutoSave

noteTitle.addEventListener("input", scheduleAutoSave);

noteContent.addEventListener("input", scheduleAutoSave);

/* =========================
   START APPLICATION
========================= */

/* =========================
   INITIALIZE APPLICATION
========================= */

async function initApp() {

    try {

        await openDatabase();

        const savedNotes = await loadNotes();

        if (savedNotes.length > 0) {

            notes = savedNotes;

        } else {

            await saveNotes();

        }

        displayNotes();

    } catch (error) {

        console.error("Database error:", error);

        alert("Unable to load notes database.");

    }
}

initApp();
