document.addEventListener('DOMContentLoaded', () => {
    // --- UI ELEMENTS ---
    const xrayToggle = document.getElementById('xray');
    const magicToggle = document.getElementById('magic');
    const hiddenToggle = document.getElementById('hidden_fields');
    const teleportToggle = document.getElementById('teleport'); // NEW
    const exportHeader = document.getElementById('toggle-export');
    const exportPanel = document.getElementById('export-panel');
    const btnScan = document.getElementById('btn-scan');
    const btnCsv = document.getElementById('btn-csv');
    const previewList = document.getElementById('field-list-preview');
    const statusMsg = document.getElementById('status-msg');

    let currentFields = [];
    let currentDocType = "frappe_data";

    // --- 1. SYNC STATE ---
    chrome.storage.local.get(['xray', 'magic', 'hidden_fields', 'teleport'], (res) => {
        xrayToggle.checked = res.xray || false;
        magicToggle.checked = res.magic || false;
        hiddenToggle.checked = res.hidden_fields || false;
        teleportToggle.checked = res.teleport || false; // NEW
    });

    const updateState = () => {
        const config = {
            xray: xrayToggle.checked,
            magic: magicToggle.checked,
            hidden_fields: hiddenToggle.checked,
            teleport: teleportToggle.checked // NEW
        };
        chrome.storage.local.set(config);
        
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if(tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "UPDATE_CONFIG", config: config });
        });
        showStatus('Settings saved');
    };

    xrayToggle.addEventListener('change', updateState);
    magicToggle.addEventListener('change', updateState);
    hiddenToggle.addEventListener('change', updateState);
    teleportToggle.addEventListener('change', updateState); // NEW

    // --- 2. EXPORTER UI ---
    exportHeader.addEventListener('click', () => {
        exportHeader.classList.toggle('expanded');
        if (exportHeader.classList.contains('expanded')) {
            exportPanel.style.display = 'block';
        } else {
            exportPanel.style.display = 'none';
        }
    });

    function showStatus(msg) {
        statusMsg.innerText = msg;
        setTimeout(() => statusMsg.innerText = 'Ready to assist.', 3000);
    }

    // --- 3. SCAN LOGIC ---
    btnScan.addEventListener('click', () => {
        btnScan.innerText = '⏳ Scanning...';
        btnScan.disabled = true;
        
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if(tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "GET_FIELDS" });
        });
    });

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "FIELDS_DATA") {
            currentFields = msg.data.fields || [];
            currentDocType = msg.data.doctype || "frappe_data";
            
            renderPreview();
            btnScan.innerText = '🔄 Re-Scan Fields';
            btnScan.disabled = false;
            
            if (currentFields.length > 0) {
                btnCsv.style.display = 'flex';
                btnCsv.innerText = `Download ${currentDocType} CSV`;
                showStatus(`Found ${currentFields.length} fields`);
            } else {
                btnCsv.style.display = 'none';
                showStatus('No fields found');
            }
        }
    });

    function renderPreview() {
        previewList.style.display = 'block';
        previewList.innerHTML = '';
        
        if (currentFields.length === 0) {
            previewList.innerHTML = '<div style="padding:20px;text-align:center;color:#999;font-size:11px">No visible fields found.</div>';
            return;
        }

        const header = document.createElement('div');
        header.className = 'list-header';
        header.innerHTML = `<input type="checkbox" id="select-all" checked> <label>Select All (${currentFields.length})</label>`;
        previewList.appendChild(header);

        header.querySelector('input').addEventListener('change', (e) => {
            previewList.querySelectorAll('.field-check').forEach(cb => cb.checked = e.target.checked);
        });

        currentFields.forEach((f, i) => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <input type="checkbox" class="field-check" checked data-idx="${i}">
                <label title="${f.fieldname}">${f.label || f.fieldname}</label>
                <span style="font-size:10px;color:#999;background:#f0f0f0;padding:2px 4px;border-radius:3px">${f.fieldtype}</span>
            `;
            previewList.appendChild(div);
        });
    }

    // --- 4. EXPORT CSV ---
    btnCsv.addEventListener('click', () => {
        const selectedIndices = Array.from(previewList.querySelectorAll('.field-check:checked')).map(cb => cb.dataset.idx);
        
        if (selectedIndices.length === 0) {
            showStatus('⚠️ Select at least one field');
            return;
        }

        const cols = {
            label: document.getElementById('col-label').checked,
            fieldname: document.getElementById('col-name').checked,
            fieldtype: document.getElementById('col-type').checked,
            options: document.getElementById('col-opts').checked,
            value: document.getElementById('col-val').checked
        };

        let headers = [];
        if(cols.label) headers.push("Label");
        if(cols.fieldname) headers.push("Fieldname");
        if(cols.fieldtype) headers.push("Type");
        if(cols.options) headers.push("Options");
        if(cols.value) headers.push("Value");

        let csv = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

        selectedIndices.forEach(i => {
            const f = currentFields[i];
            let row = [];
            if(cols.label) row.push(`"${(f.label||'').replace(/"/g,'""')}"`);
            if(cols.fieldname) row.push(`"${(f.fieldname||'').replace(/"/g,'""')}"`);
            if(cols.fieldtype) row.push(`"${(f.fieldtype||'').replace(/"/g,'""')}"`);
            if(cols.options) row.push(`"${(f.options||'').replace(/"/g,'""')}"`);
            if(cols.value) row.push(`"${(String(f.value||'')).replace(/"/g,'""')}"`);
            csv += row.join(",") + "\n";
        });

        const link = document.createElement("a");
        link.href = encodeURI(csv);
        
        const cleanName = currentDocType.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `${cleanName}_fields.csv`;
        
        document.body.appendChild(link);
        link.click();
        document.body.remove();
        
        showStatus('CSV Downloaded!');
    });
});