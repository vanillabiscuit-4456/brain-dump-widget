const API_URL = "/api/memo";
let currentFolder = "";

// フォルダ名 → CSSクラス名の変換
function folderClass(folder) {
  const map = {
    "IDEA": "folder-idea",
    "MEMO": "folder-memo",
    "TO DO": "folder-todo",
    "SCHEDULE": "folder-schedule",
    "ARCHIVE": "folder-archive",
  };
  return map[folder] || "";
}

// === タブ切り替え ===
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".folder-icon").forEach((f) => f.classList.remove("active"));
    tab.classList.add("active");
    currentFolder = tab.dataset.folder;
    loadMemos();
  });
});

// === サイドバーフォルダ：タップで絞り込み ===
document.querySelectorAll(".folder-icon").forEach((folder) => {
  folder.addEventListener("click", () => {
    const f = folder.dataset.folder;
    if (currentFolder === f) {
      currentFolder = "";
      folder.classList.remove("active");
      document.querySelectorAll(".tab").forEach((t) => {
        t.classList.toggle("active", t.dataset.folder === "");
      });
    } else {
      currentFolder = f;
      document.querySelectorAll(".folder-icon").forEach((fi) => fi.classList.remove("active"));
      document.querySelectorAll(".tab").forEach((t) => {
        t.classList.toggle("active", t.dataset.folder === f);
      });
      folder.classList.add("active");
    }
    loadMemos();
  });

  // === ドロップ先としてのフォルダ ===
  folder.addEventListener("dragover", (e) => {
    e.preventDefault();
    folder.classList.add("drag-over");
  });

  folder.addEventListener("dragleave", () => {
    folder.classList.remove("drag-over");
  });

  folder.addEventListener("drop", async (e) => {
    e.preventDefault();
    folder.classList.remove("drag-over");
    const memoId = e.dataTransfer.getData("text/plain");
    const targetFolder = folder.dataset.folder;
    if (memoId && targetFolder) {
      await updateMemoFolder(memoId, targetFolder);
      await loadMemos();
    }
  });
});

// === メモ送信 ===
document.getElementById("sendBtn").addEventListener("click", sendMemo);
document.getElementById("memoInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.isComposing) {
    e.preventDefault();
    sendMemo();
  }
});

async function sendMemo() {
  const input = document.getElementById("memoInput");
  const folder = document.getElementById("folderSelect").value;
  const memo = input.value.trim();
  if (!memo) return;

  input.value = "";
  document.getElementById("sendBtn").disabled = true;

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo, folder }),
    });
    await loadMemos();
  } catch (err) {
    console.error("送信エラー:", err);
  } finally {
    document.getElementById("sendBtn").disabled = false;
    input.focus();
  }
}

// === フォルダ移動（PATCH） ===
async function updateMemoFolder(memoId, newFolder) {
  try {
    await fetch(API_URL, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: memoId, folder: newFolder }),
    });
  } catch (err) {
    console.error("フォルダ移動エラー:", err);
  }
}

// === チェックボックス切り替え（PUT） ===
async function toggleDone(memoId, done) {
  try {
    await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: memoId, done: done }),
    });
  } catch (err) {
    console.error("チェック更新エラー:", err);
  }
}

// === メモ一覧読み込み ===
async function loadMemos() {
  const list = document.getElementById("memoList");
  list.innerHTML = "<div style='text-align:center;color:#aaa;padding:20px;'>読み込み中...</div>";

  try {
    let params = currentFolder ? "?folder=" + encodeURIComponent(currentFolder) : "";
    // ALLの時はARCHIVEを除外（サーバ側で対応しないのでフロントで除外）
    const res = await fetch(API_URL + params);
    let memos = await res.json();

    // ALLタブの時はARCHIVEを除外
    if (!currentFolder) {
      memos = memos.filter((m) => m.folder !== "ARCHIVE");
    }

    if (memos.length === 0) {
      list.innerHTML = "<div style='text-align:center;color:#aaa;padding:20px;'>メモがありません</div>";
      return;
    }

    // 古い順（最新が一番下）
    const sorted = memos.reverse();

    list.innerHTML = sorted
      .map((m) => {
        const date = new Date(m.created);
        const time = date.toLocaleString("ja-JP", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const doneClass = m.done ? " done" : "";
        const checked = m.done ? " checked" : "";
        const cssClass = folderClass(m.folder);

        return '<div class="memo-item ' + cssClass + '" draggable="true" data-id="' + m.id + '">' +
          '<div class="memo-header">' +
          '<input type="checkbox" class="memo-checkbox" data-id="' + m.id + '"' + checked + '>' +
          '<span class="memo-folder">' + m.folder + '</span>' +
          '</div>' +
          '<div class="memo-text' + doneClass + '">' + m.memo + '</div>' +
          '<div class="memo-time">' + time + '</div>' +
          '</div>';
      })
      .join("");

    // ドラッグ開始イベント
    list.querySelectorAll(".memo-item").forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", item.dataset.id);
        item.classList.add("dragging");
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
      });
    });

    // チェックボックスイベント
    list.querySelectorAll(".memo-checkbox").forEach((cb) => {
      cb.addEventListener("change", async (e) => {
        const id = cb.dataset.id;
        const done = cb.checked;
        const textEl = cb.closest(".memo-item").querySelector(".memo-text");
        textEl.classList.toggle("done", done);
        await toggleDone(id, done);
      });
    });

    list.scrollTop = list.scrollHeight;
  } catch (err) {
    list.innerHTML = "<div style='text-align:center;color:#aaa;padding:20px;'>読み込みエラー</div>";
    console.error("読み込みエラー:", err);
  }
}

// 初回読み込み
loadMemos();
