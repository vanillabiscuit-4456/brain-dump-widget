const API_URL = "/api/memo";
let currentFolder = "";

// タブ切り替え
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentFolder = tab.dataset.folder;
    loadMemos();
  });
});

// メモ送信（SENDボタンのみ）
document.getElementById("sendBtn").addEventListener("click", sendMemo);

// Enterキーでも送信（ただしIME変換中は無視）
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

  // 先に入力欄をクリア
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

// メモ一覧読み込み
async function loadMemos() {
  const list = document.getElementById("memoList");
  list.innerHTML = "<div style='text-align:center;color:#aaa;padding:20px;'>読み込み中...</div>";

  try {
    const params = currentFolder ? "?folder=" + encodeURIComponent(currentFolder) : "";
    const res = await fetch(API_URL + params);
    const memos = await res.json();

    if (memos.length === 0) {
      list.innerHTML = "<div style='text-align:center;color:#aaa;padding:20px;'>メモがありません</div>";
      return;
    }

    list.innerHTML = memos
      .map((m) => {
        const date = new Date(m.created);
        const time = date.toLocaleString("ja-JP", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        return '<div class="memo-item">' +
          '<div class="memo-folder">' + m.folder + '</div>' +
          '<div>' + m.memo + '</div>' +
          '<div class="memo-time">' + time + '</div>' +
          '</div>';
      })
      .join("");

    list.scrollTop = list.scrollHeight;
  } catch (err) {
    list.innerHTML = "<div style='text-align:center;color:#aaa;padding:20px;'>読み込みエラー</div>";
    console.error("読み込みエラー:", err);
  }
}

// 初回読み込み
loadMemos();
