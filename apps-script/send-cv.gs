/**
 * Send CV — the "Send CV" link in each fwg.fyi CV-request email lands here.
 *
 * Deploy as a web app in the personal Google account:
 *   Execute as: Me · Who has access: Only myself
 * so the link does nothing for anyone but Freddie. Opening it shows a confirm page;
 * the send only happens on the button press, so a link prefetch can never send.
 *
 * The PDF rides along as CV_PDF_B64 in cv.gs, which bin/send-cv-deploy.sh writes from
 * ../fwg-cv at deploy time — it never lands in this (public) repo.
 */

const SUBJECT = "Freddie Gebbett: CV";
const BODY = [
  "Hi,",
  "",
  "Thanks for asking. My CV's attached.",
  "",
  "Quick context: I run ops at Lawhive, an AI legal startup, and I'm looking for a founders associate or ops role at an early-stage company where I can help take it from zero to one.",
  "",
  "If it looks like a fit, I'd be up for a quick call this week or next. Just reply here.",
  "",
  "Freddie",
  "fwg.fyi",
].join("\n");

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

function doGet(e) {
  const to = address(e && e.parameter && e.parameter.to);
  if (!to) return page("<p>No valid address on this link.</p>");

  const prior = GmailApp.search(`in:sent to:${to} subject:"${SUBJECT}"`, 0, 1);
  const warn = prior.length
    ? `<p class="warn">Already sent on ${esc(prior[0].getLastMessageDate().toDateString())}.</p>`
    : "";

  return page(`
    <p>Send the CV to <b>${esc(to)}</b>?</p>
    ${warn}
    <button id="go">SEND CV</button>
    <p id="out" role="status"></p>
    <script>
      const TO = ${JSON.stringify(to)};
      const go = document.getElementById("go"), out = document.getElementById("out");
      go.onclick = () => {
        go.disabled = true; go.textContent = "SENDING…";
        google.script.run
          .withSuccessHandler(() => { go.remove(); out.textContent = "Sent to " + TO + "."; })
          .withFailureHandler(err => { go.disabled = false; go.textContent = "SEND CV"; out.textContent = "Failed: " + err.message; })
          .sendCv(TO);
      };
    </script>`);
}

function sendCv(to) {
  to = address(to);                // called straight from the page, so check again
  if (!to) throw new Error("Not a valid address");
  const pdf = Utilities.newBlob(Utilities.base64Decode(CV_PDF_B64), MimeType.PDF, "Freddie_Gebbett_CV.pdf");
  GmailApp.sendEmail(to, SUBJECT, BODY, { attachments: [pdf], name: "Freddie Gebbett" });
}

function address(raw) {
  const a = String(raw || "").trim();
  return EMAIL.test(a) ? a : "";
}

function page(inner) {
  return HtmlService.createHtmlOutput(`
    <style>
      body{font:16px/1.5 -apple-system,system-ui,sans-serif;max-width:420px;margin:48px auto;padding:0 16px;color:#222}
      button{font:600 14px system-ui;letter-spacing:.06em;padding:12px 22px;border:0;border-radius:999px;background:#222;color:#fff;cursor:pointer}
      button:disabled{opacity:.6}
      .warn{color:#b35a00}
    </style>${inner}`).setTitle("Send CV");
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
