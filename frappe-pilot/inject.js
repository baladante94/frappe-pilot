(function() {
    let observer = null;
    let configLoaded = false;
    let lastUrl = location.href;

    // --- 1. ROUTE LISTENER ---
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(() => window.frappePilot && window.frappePilot.refreshState(true), 500);
            setTimeout(() => window.frappePilot && window.frappePilot.refreshState(true), 1500);
        }
    }, 500);

    // --- 2. HANDSHAKE ---
    const handshakeInterval = setInterval(() => {
        if (configLoaded) { clearInterval(handshakeInterval); return; }
        window.postMessage({ type: "FRAPPE_PILOT_HELLO" }, "*");
    }, 500);
    setTimeout(() => clearInterval(handshakeInterval), 5000);

    // --- 3. SAFETY NET ---
    setInterval(() => {
        if (window.frappePilot?.config?.teleport) window.frappePilot.injectTeleportButton();
        if (window.frappePilot?.config?.xray) window.frappePilot.refreshXRay();
        if (window.frappePilot?.config?.hidden_fields) window.frappePilot.toggleHiddenFields(true, true);
        if (window.frappePilot?.config?.link_peek) window.frappePilot.refreshLinkedPeek();
        if (window.frappePilot?.config?.schema_export) window.frappePilot.injectSchemaExportBtn();
        if (window.frappePilot?.config?.perm_inspector) window.frappePilot.refreshPermInspector();
    }, 1500);

    // --- 4. DATA ---
    const MOCK = {
        male:    ["Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Rohan", "Rahul", "Amit", "Vikram", "Karan", "Dev", "Nikhil"],
        female:  ["Diya", "Saanvi", "Ananya", "Aditi", "Priya", "Neha", "Pooja", "Sneha", "Kavya", "Isha", "Riya", "Nisha"],
        last:    ["Sharma", "Verma", "Gupta", "Malhotra", "Patel", "Singh", "Kumar", "Reddy", "Joshi", "Nair", "Iyer", "Shah"],
        biz:     ["Apex", "Global", "Zenith", "Orbit", "Prime", "Elite", "Vertex", "Summit", "Nexus", "Pinnacle", "Vanguard"],
        biz_suf: ["Technologies", "Logistics", "Solutions", "Enterprises", "Traders", "Consulting", "Industries", "Services"],
        cities:  ["Mumbai", "Bangalore", "Delhi", "Chennai", "Hyderabad", "Pune", "Ahmedabad", "Kolkata", "Jaipur", "Surat"],
        states:  ["Maharashtra", "Karnataka", "Tamil Nadu", "Telangana", "Gujarat", "Delhi", "Rajasthan", "West Bengal", "Kerala", "Punjab"],
        streets: ["MG Road", "Brigade Road", "Linking Road", "Nehru Place", "Connaught Place", "FC Road", "Anna Salai", "Banjara Hills"],
        lorem:   "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
    };

    // --- 5. MAIN CONTROLLER ---
    window.frappePilot = {
        config: { xray: false, magic: false, hidden_fields: false, teleport: true, link_peek: false, schema_export: false, perm_inspector: false },
        fieldClipboard: null,
        burstInterval: null,
        keysSetup: false,
        peekCache: {},
        _lastPermDoctype: null,

        updateConfig: function(newConfig) {
            const hiddenChanged   = this.config.hidden_fields  !== newConfig.hidden_fields;
            const teleportOn      = !this.config.teleport       && newConfig.teleport;
            const schemaOn        = !this.config.schema_export  && newConfig.schema_export;
            const permOn          = !this.config.perm_inspector && newConfig.perm_inspector;
            const peekOn          = !this.config.link_peek      && newConfig.link_peek;

            this.config = { ...this.config, ...newConfig };
            configLoaded = true;

            if (hiddenChanged) this.toggleHiddenFields(this.config.hidden_fields, false);
            else this.refreshState(false);

            // Burst-retry any feature that just turned ON so it activates immediately
            // without waiting for the 1500ms safety net (cur_frm may not be ready yet).
            const burst = (fn, doneCheck) => {
                let n = 0;
                const t = setInterval(() => {
                    fn();
                    if (++n >= 10 || doneCheck()) clearInterval(t);
                }, 300);
            };

            if (teleportOn) burst(() => this.injectTeleportButton(),   () => !!document.getElementById('fp-teleport-btn'));
            if (schemaOn)   burst(() => this.injectSchemaExportBtn(),   () => !!document.getElementById('fp-schema-btn'));
            if (permOn)     burst(() => this.refreshPermInspector(),    () => !!document.getElementById('fp-perm-panel'));
            if (peekOn)     burst(() => this.refreshLinkedPeek(),       () => false); // peek binds incrementally, just run 10 times
        },

        refreshState: function(silent) {
            if (this.config.xray) {
                document.body.classList.add('frappe-pilot-xray-active');
                this.startObserver();
                this.refreshXRay();
            } else {
                document.body.classList.remove('frappe-pilot-xray-active');
                document.querySelectorAll('.frappe-pilot-badge').forEach(el => el.remove());
                this.stopObserver();
            }
            if(this.config.hidden_fields) this.toggleHiddenFields(true, true);
            this.injectTeleportButton();
            this.refreshLinkedPeek();
            this.injectSchemaExportBtn();
            this.refreshPermInspector();
            this.setupKeys();
        },

        init: function() { 
            this.refreshState(true);
            this.setupKeys();
        },

        setupKeys: function() {
            if (this.keysSetup) return;
            this.keysSetup = true;
            document.addEventListener('keydown', (e) => {
                const isTrigger = (e.altKey || e.metaKey) && e.shiftKey && e.code === 'KeyF';
                if (this.config.magic && isTrigger) { 
                    e.preventDefault(); e.stopPropagation();
                    this.fillMagicData(); 
                }
            });
        },

        // ============================================================
        //  FEATURE 1: X-RAY
        // ============================================================
        startObserver: function() {
            if (observer) return;
            observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;
                for (let m of mutations) { if (m.type === 'childList' && m.addedNodes.length > 0) shouldUpdate = true; }
                if (shouldUpdate) {
                    this.refreshXRay();
                    if (this.burstInterval) clearInterval(this.burstInterval);
                    let count = 0;
                    this.burstInterval = setInterval(() => {
                        count++;
                        this.refreshXRay();
                        if (count >= 10) clearInterval(this.burstInterval);
                    }, 200);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        },

        stopObserver: function() { if(observer) { observer.disconnect(); observer=null; } },

        refreshXRay: function() {
            if (!this.config.xray) return;
            document.querySelectorAll('.frappe-pilot-badge').forEach(b => { if(!document.body.contains(b)) b.remove(); });

            const controls = document.querySelectorAll('[data-fieldname]');
            const GARBAGE_REGEX = /^(sec_break|col_break|tab_break|column_break|section_break|spacer_|header_|__)/i;
            const IGNORED_TYPES = ['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Fold', 'Spacer', 'Heading', 'Image'];

            // Form Builder (Customize Form / DocType) previews fields for drag-and-drop; badges only get in the way there.
            document.querySelectorAll('.form-builder-container .frappe-pilot-badge').forEach(b => b.remove());

            controls.forEach(control => {
                if (control.closest('.form-builder-container')) return;
                let fieldname = control.getAttribute('data-fieldname');
                if (!fieldname || GARBAGE_REGEX.test(fieldname)) return;
                
                const existingBadge = control.querySelector('.frappe-pilot-badge') || 
                                      (control.nextSibling && control.nextSibling.classList && control.nextSibling.classList.contains('frappe-pilot-badge') ? control.nextSibling : null);

                if (control.classList.contains('section-break') || control.classList.contains('col-break') || control.classList.contains('column-break')) return;
                if (control.closest('.grid-row') && !control.closest('.grid-row-open')) return;

                let fieldDef = this.findFieldDef(fieldname, control);
                if (fieldDef && IGNORED_TYPES.includes(fieldDef.fieldtype)) return;

                if (existingBadge) {
                    if (existingBadge.getAttribute('data-incomplete') === 'true' && fieldDef) existingBadge.remove();
                    else return;
                }
                this.renderBadge(control, fieldDef, fieldname);
            });
        },

        findFieldDef: function(fieldname, control) {
            if (window.cur_dialog && $(window.cur_dialog.wrapper).is(':visible')) {
                if (window.cur_dialog.fields) {
                    const found = window.cur_dialog.fields.find(f => f.fieldname === fieldname);
                    if (found) return found.df || found;
                }
                if (window.cur_dialog.fields_dict && window.cur_dialog.fields_dict[fieldname]) return window.cur_dialog.fields_dict[fieldname].df;
            }
            if (window.cur_frm) {
                 const gridRowOpen = control ? control.closest('.grid-row-open') : null;
                 if (gridRowOpen) {
                    const gridWrapper = gridRowOpen.closest('.form-grid');
                    if (gridWrapper) {
                        const allFields = window.cur_frm.meta.fields.filter(f => f.fieldtype === 'Table');
                        for (let tf of allFields) {
                            if (gridWrapper.closest(`[data-fieldname="${tf.fieldname}"]`)) {
                                if (tf.options) return frappe.meta.get_docfield(tf.options, fieldname);
                            }
                        }
                    }
                 }
                 let found = frappe.meta.get_docfield(window.cur_frm.doctype, fieldname);
                 if (found) return found;
                 if (window.cur_frm.fields_dict && window.cur_frm.fields_dict[fieldname]) return window.cur_frm.fields_dict[fieldname].df;
            }
            return null;
        },

        renderBadge: function(control, fieldDef, fallbackName) {
            if (fieldDef && fieldDef.df) fieldDef = fieldDef.df;
            const badge = document.createElement('span');
            badge.className = 'frappe-pilot-badge';
            if (!fieldDef) badge.setAttribute('data-incomplete', 'true');

            badge.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-left:10px;align-self:center;white-space:nowrap;max-width:100%';

            let fName = fieldDef ? fieldDef.fieldname : fallbackName;
            let fType = fieldDef ? fieldDef.fieldtype : '';
            
            let fOpts = '';
            if (fieldDef && fieldDef.options) {
                if (Array.isArray(fieldDef.options)) fOpts = fieldDef.options.map(o => (typeof o === 'object' && o ? (o.label||o.value) : o)).join(', ');
                else fOpts = String(fieldDef.options);
            }

            const textSpan = document.createElement('span');
            textSpan.className = 'fp-badge-text';
            textSpan.style.cssText = 'cursor:copy;max-width:250px;overflow:hidden;text-overflow:ellipsis;display:block';
            
            let meta = fType;
            if (fOpts) {
                let cleanOpts = fOpts.replace(/\n/g, ', ');
                if (cleanOpts.length > 25) cleanOpts = cleanOpts.substring(0, 22) + '...';
                meta += ` : ${cleanOpts}`;
            }
            const isCustom = cint(fieldDef?.is_custom_field);
            if (isCustom) {
                badge.classList.add('fp-custom');
                badge.title = 'Custom field';
            }
            textSpan.innerHTML = `${isCustom ? '★ ' : ''}<b>${fName}</b> <span style="opacity:0.6">| ${meta}</span>`;
            textSpan.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                const t = document.createElement('textarea'); t.value = fName;
                document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t);
                frappe.show_alert(`Copied: ${fName}`);
            };
            badge.appendChild(textSpan);

            if (fType !== 'Button') {
                const iconSpan = document.createElement('span');
                iconSpan.innerHTML = '📋';
                iconSpan.style.cssText = 'cursor:pointer;flex-shrink:0';
                iconSpan.title = "Copy Value";
                iconSpan.onclick = (e) => {
                    e.preventDefault(); e.stopPropagation();
                    let def = fieldDef || { fieldname: fName, fieldtype: fType || 'Data', label: fName };
                    this.handleFieldAction(def, control); 
                };
                badge.appendChild(iconSpan);
            }

            const makeIcon = (icon, title, onClick) => {
                const s = document.createElement('span');
                s.innerHTML = icon;
                s.style.cssText = 'cursor:pointer;flex-shrink:0';
                s.title = title;
                s.onclick = (e) => { e.preventDefault(); e.stopPropagation(); onClick(); };
                badge.appendChild(s);
            };

            const ownerDoctype = this.findOwnerDoctype(fieldDef, control);
            if (ownerDoctype && fName) {
                makeIcon('⚙️', `Customize "${fName}" in ${ownerDoctype}`, () => this.openCustomize(ownerDoctype, fName));
            }

            const targetDoctype = typeof fieldDef?.options === 'string' ? fieldDef.options.trim() : '';
            if (['Link', 'Table', 'Table MultiSelect'].includes(fType) && targetDoctype) {
                makeIcon('↗️', `Customize ${targetDoctype}`, () => this.openCustomize(targetDoctype));
            }

            if (fieldDef?.fieldtype === 'Button') {
                const btn = control.querySelector('button');
                if (btn) {
                    if (btn.nextSibling) btn.parentNode.insertBefore(badge, btn.nextSibling);
                    else btn.parentNode.appendChild(badge);
                    return; 
                }
            }

            let target = control.querySelector('.control-label');
            if(!target) target = control.querySelector('label'); 
            if(!target && control.closest('.grid-row-open')) target = control.closest('.form-group')?.querySelector('.control-label');
            if(target && !target.querySelector('.frappe-pilot-badge')) {
                badge.style.marginLeft = '8px';
                target.appendChild(badge);
            }
        },

        // Doctype that owns the field: the child doctype inside an open grid row, else the form's doctype.
        // Dialog fields don't belong to a doctype, so they get no customize icon.
        findOwnerDoctype: function(fieldDef, control) {
            if (control && control.closest('.modal')) return null;
            if (!window.cur_frm) return null;
            const gridRowOpen = control ? control.closest('.grid-row-open') : null;
            if (gridRowOpen) {
                const tableField = window.cur_frm.meta.fields.find(tf =>
                    ['Table', 'Table MultiSelect'].includes(tf.fieldtype) &&
                    gridRowOpen.closest(`[data-fieldname="${tf.fieldname}"]`));
                return tableField ? tableField.options : null;
            }
            return fieldDef?.parent || window.cur_frm.doctype;
        },

        // Mirrors Frappe's own "Customize" menu: custom doctypes open in DocType, standard ones in Customize Form.
        // With a fieldname, it also opens that field's row once the form has loaded.
        openCustomize: function(doctype, fieldname) {
            frappe.model.with_doctype(doctype, () => {
                const meta = frappe.get_meta(doctype);
                if (!meta) { frappe.show_alert({ message: `DocType not found: ${doctype}`, indicator: 'red' }); return; }
                if (meta.issingle) { frappe.show_alert({ message: `${doctype} is a Single DocType and can't be customized`, indicator: 'orange' }); return; }
                const formDoctype = meta.custom ? 'DocType' : 'Customize Form';
                if (meta.custom) frappe.set_route('Form', 'DocType', doctype);
                else frappe.set_route('Form', 'Customize Form', { doc_type: doctype });
                if (fieldname) this.focusCustomizeField(formDoctype, doctype, fieldname);
            });
        },

        focusCustomizeField: function(formDoctype, doctype, fieldname) {
            let tries = 0;
            const t = setInterval(() => {
                if (++tries > 40) { clearInterval(t); return; }
                const frm = window.cur_frm;
                if (!frm || frm.doctype !== formDoctype) return;
                const loadedFor = formDoctype === 'DocType' ? frm.doc.name : frm.doc.doc_type;
                if (loadedFor !== doctype) return;

                // v15+: Customize Form / DocType open on the Form Builder tab, so select the field there.
                if (frm.get_field('form_builder')) {
                    const store = frappe.form_builder?.doctype === doctype && frappe.form_builder.store;
                    const tabs = store?.form?.layout?.tabs;
                    if (!tabs || !tabs.length) return;
                    for (const tab of tabs) {
                        for (const section of tab.sections || []) {
                            for (const column of section.columns || []) {
                                const field = (column.fields || []).find(f => f.df.fieldname === fieldname);
                                if (!field) continue;
                                clearInterval(t);
                                store.form.active_tab = tab.df.name;
                                store.form.selected_field = field.df;
                                let scrollTries = 0;
                                const s = setInterval(() => {
                                    const el = document.querySelector('.form-builder-container .field.selected');
                                    if (el || ++scrollTries > 12) clearInterval(s);
                                    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                                }, 250);
                                return;
                            }
                        }
                    }
                    return;
                }

                // v13/v14: no Form Builder, open the row in the classic fields table.
                const row = (frm.doc.fields || []).find(f => f.fieldname === fieldname);
                const grid = frm.fields_dict.fields?.grid;
                if (!row || !grid) return;
                const pager = grid.grid_pagination;
                if (pager && pager.page_length) {
                    const page = Math.ceil(row.idx / pager.page_length);
                    if (pager.page_index !== page) pager.go_to_page(page);
                }
                const gridRow = grid.grid_rows_by_docname?.[row.name];
                if (!gridRow || !gridRow.row || !document.body.contains(gridRow.row[0])) return;
                clearInterval(t);
                gridRow.toggle_view(true);
            }, 250);
        },

        // ============================================================
        //  FEATURE 2: FIELD CLIPBOARD (Cross-Domain)
        // ============================================================
        handleFieldAction: function(fieldDef, control) {
            let context = window.cur_dialog && $(window.cur_dialog.wrapper).is(':visible') ? window.cur_dialog : window.cur_frm;
            if(!context) return;

            const hasClip = this.fieldClipboard !== null && this.fieldClipboard !== undefined;
            let options = [];

            if (fieldDef.fieldtype === 'Table') {
                options.push({ label: 'Copy Entire Table', action: () => this.copyFieldData(fieldDef, context, control, true) });
                options.push({ label: 'Copy Selected Rows', action: () => this.copyFieldData(fieldDef, context, control) });
            } else {
                options.push({ label: 'Copy Value', action: () => this.copyFieldData(fieldDef, context, control) });
            }

            if (hasClip) {
                let clipData = this.fieldClipboard;
                let typeInfo = clipData.type === 'rows' ? `(${clipData.value.length} rows)` : `(Value)`;
                options.push({ label: `Paste ${typeInfo}`, action: () => this.pasteFieldData(fieldDef, context, clipData) });
                options.push({ label: 'Clear Clipboard', action: () => this.clearFieldClipboard() });
            }

            let d = new frappe.ui.Dialog({
                title: `${fieldDef.label || fieldDef.fieldname}`,
                width: 300,
                fields: [{ fieldtype: 'HTML', options: `<div style="padding:5px 0;">${options.map(o => `<button class="btn btn-default btn-block btn-sm" style="margin-bottom:5px; text-align:left;" data-label="${o.label}">${o.label}</button>`).join('')}</div>` }]
            });
            d.show();
            d.$wrapper.find('button').on('click', function() {
                let label = $(this).attr('data-label');
                let opt = options.find(o => o.label === label);
                try { if(opt) opt.action(); } catch(e) { frappe.msgprint("Error: " + e.message); } finally { d.hide(); }
            });
        },

        copyFieldData: function(fieldDef, context, control, entireTable) {
            let val = null;
            let type = 'value';
            if (fieldDef.fieldtype === 'Table') {
                if (context.fields_dict[fieldDef.fieldname]?.grid) {
                    val = entireTable
                        ? (context.doc?.[fieldDef.fieldname] || [])
                        : context.fields_dict[fieldDef.fieldname].grid.get_selected_children();
                    if(!val || val.length === 0) throw new Error(entireTable ? "Table is empty." : "Select rows first.");
                    type = 'rows';
                }
            } else {
                const gridRow = $(control).closest('.grid-row');
                if (gridRow.length) {
                    const docName = gridRow.attr('data-name');
                    const cdt = gridRow.attr('data-doctype');
                    if (docName && cdt) {
                        if (locals[cdt] && locals[cdt][docName]) val = locals[cdt][docName][fieldDef.fieldname];
                        if (val === undefined || val === null) val = frappe.model.get_value(cdt, docName, fieldDef.fieldname);
                    } 
                } else {
                    if (context.doc && context.doc[fieldDef.fieldname] !== undefined) val = context.doc[fieldDef.fieldname];
                    else if (typeof context.get_value === 'function') val = context.get_value(fieldDef.fieldname);
                }
            }
            if (val === null || val === undefined || val === "") throw new Error("Value is empty.");
            
            const payload = { type, value: val };
            this.fieldClipboard = payload; 
            window.postMessage({ type: "FRAPPE_PILOT_COPY_FIELD", payload: payload }, "*");
            
            frappe.show_alert(`📋 Copied ${type === 'rows' ? val.length + ' rows' : 'value'}.`);
        },

        // A row is blank when its mandatory and grid-visible fields are all empty (e.g. the row a new form starts with).
        // Other fields are ignored because Frappe pre-fills things like UOM and cost center from defaults.
        removeBlankRows: function(context, fieldDef) {
            const rows = context.doc?.[fieldDef.fieldname];
            if (!rows || !rows.length || !fieldDef.options) return;
            const meta = frappe.get_meta(fieldDef.options);
            if (!meta) return;
            const valueFields = meta.fields.filter(df => !frappe.model.no_value_type.includes(df.fieldtype));
            const keyFields = valueFields.filter(df => cint(df.reqd) || cint(df.in_list_view));
            const checkFields = keyFields.length ? keyFields : valueFields;
            const isBlank = row => checkFields.every(df => {
                const v = row[df.fieldname];
                if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return true;
                if (df.default !== undefined && df.default !== null && String(v) === String(df.default)) return true;
                return ['Int', 'Float', 'Currency', 'Percent', 'Check'].includes(df.fieldtype) && flt(v) === 0;
            });
            const blanks = rows.filter(isBlank);
            if (!blanks.length) return;
            blanks.forEach(row => frappe.model.clear_doc(row.doctype, row.name));
            context.doc[fieldDef.fieldname] = rows.filter(r => !blanks.includes(r));
            context.doc[fieldDef.fieldname].forEach((r, i) => { r.idx = i + 1; });
        },

        pasteFieldData: function(fieldDef, context, clipData) {
            if (clipData.type === 'rows') {
                if (fieldDef.fieldtype !== 'Table') { frappe.msgprint("Can only paste rows into a Table."); return; }
                let rows = clipData.value;
                this.removeBlankRows(context, fieldDef);
                rows.forEach(row => {
                    let newRow = frappe.model.copy_doc(row);
                    delete newRow.name; delete newRow.creation; delete newRow.modified; delete newRow.idx; delete newRow.parent;
                    context.add_child(fieldDef.fieldname, newRow);
                });
                context.refresh_field(fieldDef.fieldname);
                frappe.show_alert(`📋 Appended ${rows.length} rows.`);
            } else {
                if(context.set_value) {
                    context.set_value(fieldDef.fieldname, clipData.value);
                    frappe.show_alert(`📋 Pasted value.`);
                }
            }
        },

        clearFieldClipboard: function() {
            this.fieldClipboard = null;
            window.postMessage({ type: "FRAPPE_PILOT_CLEAR_CLIPBOARD" }, "*");
            frappe.show_alert('📋 Clipboard cleared.');
        },

        // ============================================================
        //  FEATURE 3: MAGIC FILLER (AI-powered)
        // ============================================================
        fillMagicData: async function() {
            let context = window.cur_dialog && $(window.cur_dialog.wrapper).is(':visible') ? window.cur_dialog : window.cur_frm;
            if (!context) { frappe.msgprint("No active form."); return; }

            let allFields = [];
            if (context.fields) allFields = context.fields.map(f => f.df || f);
            else if (context.meta && context.meta.fields) allFields = context.meta.fields;

            const SKIP_TYPES  = new Set(['Section Break','Column Break','HTML','Tab Break','Button','Table','Table MultiSelect','Signature','Attach','Attach Image']);
            const SKIP_FIELDS = new Set(['naming_series','company','amended_from','parent','parenttype','parentfield']);

            const fillable = allFields.filter(f =>
                f && f.fieldname &&
                !cint(f.hidden) && !cint(f.read_only) && !cint(f.is_virtual) &&
                !SKIP_TYPES.has(f.fieldtype) &&
                !SKIP_FIELDS.has(f.fieldname)
            );

            if (fillable.length === 0) { frappe.show_alert('No fillable fields found.'); return; }

            const doctype = context.doctype || (context.meta && context.meta.name) || 'Form';

            frappe.show_alert('🪄 Asking AI...', 2);

            // Build compact field metadata for the AI prompt
            const fieldsMeta = fillable.map(f => {
                let opts = '';
                if (typeof f.options === 'string') opts = f.options;
                else if (Array.isArray(f.options)) opts = f.options.map(o => (o && typeof o === 'object') ? (o.value || o.label) : o).join('\n');
                return {
                    label:     f.label || f.fieldname,
                    fieldname: f.fieldname,
                    fieldtype: f.fieldtype,
                    options:   opts,
                    reqd:      cint(f.reqd)
                };
            });

            // Request AI data; wait up to 20 s
            const aiData = await new Promise((resolve) => {
                const tid = setTimeout(() => resolve({ error: 'Request timed out.' }), 20000);
                const handler = (event) => {
                    if (event.source !== window || event.data.type !== "FRAPPE_PILOT_AI_FILL_RESPONSE") return;
                    window.removeEventListener("message", handler);
                    clearTimeout(tid);
                    resolve(event.data.payload);
                };
                window.addEventListener("message", handler);
                window.postMessage({ type: "FRAPPE_PILOT_AI_FILL_REQUEST", doctype, fields: fieldsMeta }, "*");
            });

            if (!aiData || aiData.error) {
                frappe.msgprint(`🪄 Magic Filler: ${aiData?.error || 'Unknown error.'}<br><br>Set your API key in the extension popup under <b>AI Settings</b>.`);
                return;
            }

            let count = 0;
            for (const field of fillable) {
                const val = aiData[field.fieldname];
                if (val === undefined || val === null || val === '') continue;
                try {
                    if (window.cur_dialog && $(window.cur_dialog.wrapper).is(':visible'))
                        window.cur_dialog.set_value(field.fieldname, val);
                    else
                        window.cur_frm.set_value(field.fieldname, val);
                    count++;
                } catch(e) {}
            }
            frappe.show_alert(`🪄 AI filled ${count} fields.`);
        },

        // ============================================================
        //  FEATURE 4: HIDDEN FIELDS
        // ============================================================
        toggleHiddenFields: function(enable, silent) {
            if (!silent && window.cur_frm) {
                if(enable) frappe.show_alert('👁️ Revealing hidden fields...');
                else frappe.show_alert('🙈 Hiding fields...');
            }
            const process = (field) => {
                if (!field || !field.df) return;
                if (enable) {
                    // cint: other extensions set hidden to the string "0", which is truthy.
                    if (cint(field.df.hidden)) {
                        field.df.hidden = 0; field.__fp_was_hidden = true; field.refresh();
                        const label = $(field.wrapper).find('.control-label');
                        if (label.length && !label.find('.fp-hidden-tag').length) label.append('<span class="fp-hidden-tag" style="color:#e24c4c; font-size:9px; margin-left:6px; background:#fff0f0; padding:1px 4px; border-radius:3px;">(Hidden)</span>');
                        $(field.wrapper).css('border-left', '3px solid #ffcc00');
                    }
                } else if (field.__fp_was_hidden) {
                    field.df.hidden = 1; delete field.__fp_was_hidden; field.refresh();
                    $(field.wrapper).css('border-left', 'none').find('.fp-hidden-tag').remove();
                }
            };
            if (window.cur_frm && window.cur_frm.fields_dict) $.each(window.cur_frm.fields_dict, (fn, f) => process(f));
            if (window.cur_dialog && $(window.cur_dialog.wrapper).is(':visible')) $.each(window.cur_dialog.fields_dict, (fn, f) => process(f));
        },

        // ============================================================
        //  FEATURE 5: TELEPORT / EXPORTS
        // ============================================================
        injectTeleportButton: function() {
            const btnId = 'fp-teleport-btn';
            if (!this.config.teleport) { const e = document.getElementById(btnId); if(e) e.remove(); return; }
            if (!window.cur_list || !window.cur_list.page || document.getElementById(btnId)) return;

            const pageActions = $(window.cur_list.page.wrapper).find('.page-actions');
            const standardActions = $(window.cur_list.page.wrapper).find('.standard-actions');
            let anchor = standardActions.length ? standardActions : pageActions;
            if (!anchor.length) return;

            const btnGroup = document.createElement('div');
            btnGroup.className = 'standard-actions btn-group';
            btnGroup.id = btnId;
            btnGroup.style.marginRight = '10px';
            btnGroup.style.display = 'inline-block';
            
            btnGroup.innerHTML = `<button class="btn btn-secondary btn-default dropdown-toggle" data-toggle="dropdown" style="color:var(--primary); font-weight:600; display:flex; align-items:center;"><span class="icon icon-sm" style="margin-right:4px;"><svg class="icon icon-sm" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></span>Teleport</button><ul class="dropdown-menu"><li><a class="dropdown-item" id="fp-save-docs">📋 Copy Selected</a></li><li><a class="dropdown-item" id="fp-insert-docs">📥 Paste Docs</a></li><li class="divider"></li><li><a class="dropdown-item" id="fp-export-csv">📊 Export CSV (List)</a></li><li><a class="dropdown-item" id="fp-export-json">💾 Export JSON</a></li></ul>`;
            
            anchor.prepend(btnGroup);
            document.getElementById('fp-save-docs').onclick = () => this.teleportCopy();
            document.getElementById('fp-insert-docs').onclick = () => this.teleportPaste();
            document.getElementById('fp-export-csv').onclick = () => this.exportCSV();
            document.getElementById('fp-export-json').onclick = () => this.exportJSON();
        },

        teleportCopy: async function() {
            if (!window.cur_list) return;
            const checked = window.cur_list.get_checked_items();
            if (checked.length === 0) { frappe.msgprint("Please select rows to copy."); return; }
            frappe.show_alert(`📦 Fetching ${checked.length} docs...`);
            let fullDocs = [];
            for (let item of checked) {
                try { fullDocs.push(await frappe.db.get_doc(window.cur_list.doctype, item.name)); } catch (e) {}
            }
            if (fullDocs.length > 0) {
                window.postMessage({ type: "FRAPPE_PILOT_SAVE_DOCS", payload: fullDocs }, "*");
                frappe.msgprint(`✅ Copied ${fullDocs.length} docs.`);
            }
        },

        teleportPaste: function() {
            if (!window.cur_list) return;
            window.postMessage({ type: "FRAPPE_PILOT_GET_DOCS" }, "*");
        },

        handlePasteData: async function(docs) {
            if (!docs || !docs.length) { frappe.msgprint("Clipboard empty."); return; }
            const doctype = window.cur_list.doctype;
            if (doctype !== docs[0].doctype) { frappe.msgprint(`⚠️ Mismatch! Clipboard: ${docs[0].doctype}`); return; }

            const names = docs.map(d => d.name).filter(Boolean);
            const existing = names.length
                ? (await frappe.db.get_list(doctype, { filters: { name: ['in', names] }, fields: ['name'], limit: names.length })).map(r => r.name)
                : [];

            const fields = [{ fieldtype: 'HTML', options: `<p>Paste <b>${docs.length}</b> ${frappe.utils.escape_html(doctype)} record(s) into this site.</p>` }];
            if (existing.length) {
                const preview = existing.slice(0, 5).map(n => frappe.utils.escape_html(n)).join(', ') + (existing.length > 5 ? ', …' : '');
                fields.push({ fieldtype: 'HTML', options: `<p style="color:var(--orange-600)">⚠️ ${existing.length} already exist here: ${preview}</p>` });
                fields.push({
                    label: 'For records that already exist', fieldname: 'on_existing', fieldtype: 'Select',
                    options: ['Skip', 'Update existing', 'Insert as new copy'], default: 'Skip',
                    description: 'Update overwrites the existing record with the copied values (child tables are replaced).'
                });
            }

            const d = new frappe.ui.Dialog({
                title: '📦 Teleport Paste',
                fields,
                primary_action_label: 'Paste',
                primary_action: async (values) => {
                    d.hide();
                    frappe.show_alert('🚀 Processing...');
                    const onExisting = values.on_existing || 'Skip';
                    const localCompany = frappe.defaults.get_user_default("Company") || frappe.defaults.get_default("company");
                    const result = { inserted: 0, updated: 0, skipped: 0 };
                    for (const doc of docs) {
                        if (existing.includes(doc.name)) {
                            if (onExisting === 'Skip') { result.skipped++; continue; }
                            if (onExisting === 'Update existing') {
                                if (await this.updateWithRetry(doc, localCompany)) result.updated++;
                                continue;
                            }
                        }
                        const newDoc = this.cleanDoc(doc, localCompany);
                        // Frappe only honours a given name for Prompt naming, so keeping it is harmless otherwise.
                        if (!existing.includes(doc.name)) newDoc.name = doc.name;
                        if (await this.insertWithRetry(newDoc)) result.inserted++;
                    }
                    const parts = [];
                    if (result.inserted) parts.push(`Inserted ${result.inserted}`);
                    if (result.updated) parts.push(`Updated ${result.updated}`);
                    if (result.skipped) parts.push(`Skipped ${result.skipped} existing`);
                    frappe.msgprint(`✅ ${parts.join(', ') || 'Nothing pasted'}.`);
                    window.cur_list.refresh();
                }
            });
            d.show();
        },

        updateWithRetry: async function(doc, localCompany) {
            try {
                const current = (await frappe.db.get_value(doc.doctype, doc.name, ['modified', 'docstatus', 'creation', 'owner'])).message;
                const upd = this.cleanDoc(doc, localCompany);
                // Keep this site's own bookkeeping values; v16 rejects saves that change creation.
                Object.assign(upd, { name: doc.name, modified: current.modified, docstatus: current.docstatus, creation: current.creation, owner: current.owner });
                // Child rows must go in as new (no name, __islocal) so Frappe replaces the old rows instead of silently skipping them.
                Object.keys(upd).forEach(k => {
                    if (Array.isArray(upd[k])) upd[k].forEach(row => {
                        if (!row || typeof row !== 'object') return;
                        ['name', 'parent', 'creation', 'modified', 'modified_by', 'owner'].forEach(f => delete row[f]);
                        row.__islocal = 1;
                    });
                });
                await this.serverCall('frappe.client.save', { doc: upd });
                return true;
            } catch (e) {
                return await this.showFailure(e, 'Update Failed', () => this.updateWithRetry(doc, localCompany));
            }
        },

        insertWithRetry: async function(doc) {
            try { await this.serverCall('frappe.client.insert', { doc }); return true; }
            catch (e) { return await this.showFailure(e, 'Insert Failed', () => this.insertWithRetry(doc)); }
        },

        // Like frappe.xcall, but rejects with the full response so the server's error message isn't lost.
        serverCall: function(method, args) {
            return new Promise((resolve, reject) => frappe.call({ method, args, callback: r => resolve(r.message), error: r => reject(r) }));
        },

        showFailure: function(e, title, retry) {
            let msg = (e && e.message) || (e && e.exc_type) || 'Frappe rejected this record. See the message above for details.';
            try { if (e._server_messages) msg = JSON.parse(JSON.parse(e._server_messages)[0]).message; } catch(err) {}
            return new Promise((resolve) => {
                let d = new frappe.ui.Dialog({
                    title,
                    fields: [{ fieldtype: 'HTML', options: `<div style="padding:10px; color:red; font-size:12px">${msg}</div><p>Fix manually & Retry.</p>` }],
                    primary_action_label: 'Retry',
                    primary_action: async () => { d.hide(); resolve(await retry()); },
                    secondary_action_label: 'Skip',
                    secondary_action: () => { d.hide(); resolve(false); }
                });
                d.show();
            });
        },

        cleanDoc: function(doc, localCompany) {
            let d = JSON.parse(JSON.stringify(doc));
            const strip = ['name', 'owner', 'creation', 'modified', 'modified_by', 'docstatus', 'idx', 'parent', 'parentfield', 'parenttype', 'workflow_state', 'amended_from', '_user_tags', '_comments', '_assign', '_liked_by', 'lft', 'rgt', 'old_parent', 'is_group'];
            strip.forEach(k => delete d[k]);
            if (d.company && localCompany) d.company = localCompany;
            return d;
        },

        exportCSV: function() {
            if (!window.cur_list) return;

            // Build the field list from the currently visible list columns.
            // Frappe v14+ requires `fields` or it throws a 500.
            let fields = [];
            try {
                const cols = cur_list.columns || (cur_list.get_columns ? cur_list.get_columns() : []);
                fields = cols
                    .filter(c => c.df && c.df.fieldname)
                    .map(c => `\`tab${cur_list.doctype}\`.\`${c.df.fieldname}\``);
            } catch(e) {}
            if (!fields.length) fields = [`\`tab${cur_list.doctype}\`.\`name\``];

            let filters = [];
            try { filters = cur_list.get_filters_for_args ? cur_list.get_filters_for_args() : (cur_list.get_filters ? cur_list.get_filters() : []); } catch(e) {}

            // POST with CSRF token — Frappe's own export uses this approach
            // so the response is treated as a file download, not a page redirect.
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/api/method/frappe.desk.reportview.export_query';
            form.style.display = 'none';

            const add = (name, value) => {
                const i = document.createElement('input');
                i.type = 'hidden'; i.name = name; i.value = value;
                form.appendChild(i);
            };

            add('file_format_type', 'CSV');
            add('doctype', cur_list.doctype);
            add('fields', JSON.stringify(fields));
            add('filters', JSON.stringify(filters));
            add('cmd', 'frappe.desk.reportview.export_query');
            if (frappe.csrf_token) add('csrf_token', frappe.csrf_token);

            document.body.appendChild(form);
            form.submit();
            setTimeout(() => document.body.removeChild(form), 1000);
        },

        exportJSON: async function() {
            let data = null;
            let filename = 'export.json';

            if (window.cur_list) {
                const checked = window.cur_list.get_checked_items();
                if (checked.length === 0) { frappe.msgprint("Please select rows to export JSON."); return; }
                
                frappe.show_alert('Fetching full documents...');
                let docs = [];
                for (let item of checked) {
                    try { docs.push(await frappe.db.get_doc(window.cur_list.doctype, item.name)); } catch(e){}
                }
                data = docs;
                filename = `${window.cur_list.doctype}_list.json`;
            } 
            else if (window.cur_frm && window.cur_frm.doc) {
                data = window.cur_frm.doc;
                filename = `${window.cur_frm.doctype}_${window.cur_frm.doc.name}.json`;
            }
            else {
                const result = this.getAvailableFields();
                if (!result || result.fields.length === 0) { frappe.msgprint("No fields found to export."); return; }
                
                let cleanObj = {};
                result.fields.forEach(f => {
                    if (f.value !== undefined && f.value !== null && f.value !== '') cleanObj[f.fieldname] = f.value;
                });
                data = cleanObj;
                filename = `${result.doctype}_data.json`;
            }

            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        // ============================================================
        //  FEATURE 6: LINKED DOC PEEK
        // ============================================================
        refreshLinkedPeek: function() {
            // When OFF: just hide any open tooltip and stop.
            // Do NOT remove fp-peek-bound — listeners check config at runtime,
            // so removing the class would cause duplicate listeners on re-enable.
            if (!this.config.link_peek) {
                const tt = document.getElementById('fp-peek-tooltip');
                if (tt) tt.style.display = 'none';
                return;
            }

            // Create the tooltip element once and leave it in the DOM permanently.
            if (!document.getElementById('fp-peek-tooltip')) {
                const tt = document.createElement('div');
                tt.id = 'fp-peek-tooltip';
                tt.style.cssText = 'position:fixed;z-index:99999;background:#fff;border:1px solid #e0e5ea;border-radius:10px;padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,0.10);max-width:300px;font-size:12px;display:none;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,"Inter",sans-serif;pointer-events:none;';
                document.body.appendChild(tt);
            }

            // Only bind controls that haven't been bound yet.
            // fp-peek-bound is NEVER removed — the handler guards with a runtime config check.
            document.querySelectorAll('[data-fieldname]').forEach(control => {
                if (control.classList.contains('fp-peek-bound')) return;

                const fieldname = control.getAttribute('data-fieldname');
                const fieldDef  = this.findFieldDef(fieldname, control);
                if (!fieldDef || fieldDef.fieldtype !== 'Link' || !fieldDef.options) return;

                control.classList.add('fp-peek-bound');
                let timer = null;

                control.addEventListener('mouseenter', (e) => {
                    if (!window.frappePilot.config.link_peek) return; // runtime OFF check
                    let val = null;
                    try {
                        const ctx = window.cur_dialog?.wrapper?.is(':visible') ? window.cur_dialog : window.cur_frm;
                        if (ctx?.doc && fieldname in ctx.doc) val = ctx.doc[fieldname];
                        if (!val && ctx?.get_value) val = ctx.get_value(fieldname);
                    } catch(_) {}
                    if (!val) return;
                    timer = setTimeout(() => {
                        if (window.frappePilot.config.link_peek) // guard before async fetch
                            this.showPeekTooltip(fieldDef.options, val, e);
                    }, 600);
                });

                control.addEventListener('mouseleave', () => {
                    clearTimeout(timer);
                    const tt = document.getElementById('fp-peek-tooltip');
                    if (tt) tt.style.display = 'none';
                });

                control.addEventListener('mousemove', (e) => {
                    if (!window.frappePilot.config.link_peek) return; // runtime OFF check
                    const tt = document.getElementById('fp-peek-tooltip');
                    if (tt && tt.style.display === 'block') {
                        tt.style.left = Math.min(e.clientX + 14, window.innerWidth - 320) + 'px';
                        tt.style.top  = Math.min(e.clientY + 14, window.innerHeight - 220) + 'px';
                    }
                });
            });
        },

        showPeekTooltip: async function(doctype, name, event) {
            const tt = document.getElementById('fp-peek-tooltip');
            if (!tt) return;
            tt.style.left = Math.min(event.clientX + 14, window.innerWidth - 320) + 'px';
            tt.style.top  = Math.min(event.clientY + 14, window.innerHeight - 220) + 'px';
            tt.innerHTML  = `<span style="color:#999;font-size:11px">Loading ${doctype}…</span>`;
            tt.style.display = 'block';

            const key = `${doctype}::${name}`;
            if (this.peekCache[key]) { this.renderPeekTooltip(tt, doctype, name, this.peekCache[key]); return; }

            try {
                const doc = await frappe.db.get_doc(doctype, name);
                this.peekCache[key] = doc;
                this.renderPeekTooltip(tt, doctype, name, doc);
            } catch(_) { tt.style.display = 'none'; }
        },

        renderPeekTooltip: function(tt, doctype, name, doc) {
            const SKIP = new Set(['name','owner','creation','modified','modified_by','docstatus','idx','__islocal','__onload','__unsaved','__run_link_triggers']);
            let html = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><span style="font-weight:700;font-size:13px">${name}</span><span style="font-size:9px;background:#eaf5ff;color:#2490ef;padding:1px 6px;border-radius:4px;font-weight:600">${doctype}</span></div>`;
            let count = 0;
            for (const [k, v] of Object.entries(doc)) {
                if (SKIP.has(k) || v === null || v === undefined || v === '' || typeof v === 'object' || k.startsWith('_')) continue;
                if (count >= 7) { html += `<div style="color:#aaa;font-size:10px;padding-top:4px">…more fields</div>`; break; }
                html += `<div style="display:flex;gap:8px;padding:3px 0;border-bottom:1px solid #f5f5f5;font-size:11px"><span style="color:#68768a;min-width:90px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${k}">${k}</span><span style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1" title="${v}">${v}</span></div>`;
                count++;
            }
            if (count === 0) html += `<div style="color:#999;font-size:11px">No preview fields</div>`;
            tt.innerHTML = html;
        },

        // ============================================================
        //  FEATURE 7: DOCTYPE SCHEMA EXPORT
        // ============================================================
        injectSchemaExportBtn: function() {
            const btnId = 'fp-schema-btn';
            if (!this.config.schema_export) { const e = document.getElementById(btnId); if (e) e.remove(); return; }
            if (!window.cur_frm || document.getElementById(btnId)) return;
            const pageWrapper = cur_frm.page && cur_frm.page.wrapper;
            if (!pageWrapper) return;

            const btn = document.createElement('button');
            btn.id = btnId;
            btn.className = 'btn btn-default btn-sm';
            btn.style.cssText = 'margin-right:8px;font-size:11px;color:#2490ef;font-weight:600;';
            btn.textContent = '📐 Schema';
            btn.onclick = () => this.exportSchema();
            const actions = $(pageWrapper).find('.page-actions');
            if (actions.length) actions.prepend(btn);
        },

        exportSchema: function() {
            if (!window.cur_frm) return;
            const meta = cur_frm.meta;
            const schema = {
                doctype: cur_frm.doctype,
                exported_at: new Date().toISOString(),
                exported_by: frappe.session.user,
                is_submittable: meta.is_submittable || 0,
                is_child_table: meta.istable || 0,
                autoname: meta.autoname || '',
                title_field: meta.title_field || '',
                fields: meta.fields.map(f => ({
                    label: f.label || '',
                    fieldname: f.fieldname || '',
                    fieldtype: f.fieldtype || '',
                    options: f.options || '',
                    reqd: cint(f.reqd),
                    hidden: cint(f.hidden),
                    read_only: cint(f.read_only),
                    depends_on: f.depends_on || '',
                    mandatory_depends_on: f.mandatory_depends_on || '',
                    read_only_depends_on: f.read_only_depends_on || '',
                    default: f.default || '',
                    description: f.description || '',
                    in_list_view: f.in_list_view || 0,
                    in_standard_filter: f.in_standard_filter || 0,
                    search_index: f.search_index || 0,
                    unique: f.unique || 0,
                    no_copy: f.no_copy || 0,
                    fetch_from: f.fetch_from || '',
                }))
            };
            const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url;
            a.download = `${cur_frm.doctype.replace(/\s+/g, '_')}_schema.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            frappe.show_alert(`✅ Schema exported — ${schema.fields.length} fields`);
        },

        // ============================================================
        //  FEATURE 8: PERMISSION INSPECTOR
        // ============================================================
        refreshPermInspector: function() {
            const panelId = 'fp-perm-panel';
            if (!this.config.perm_inspector) {
                const el = document.getElementById(panelId);
                if (el) el.remove();
                this._lastPermDoctype = null;
                return;
            }
            if (!window.cur_frm) return;
            const doctype = cur_frm.doctype;
            // Only rebuild when doctype changes
            if (document.getElementById(panelId) && this._lastPermDoctype === doctype) return;
            this._lastPermDoctype = doctype;
            const existing = document.getElementById(panelId);
            if (existing) existing.remove();

            const CHECKS = [
                ['Read',   () => frappe.model.can_read(doctype)],
                ['Write',  () => frappe.model.can_write(doctype)],
                ['Create', () => frappe.model.can_create(doctype)],
                ['Delete', () => frappe.model.can_delete(doctype)],
                ['Submit', () => frappe.model.can_submit(doctype)],
                ['Cancel', () => frappe.model.can_cancel(doctype)],
                ['Amend',  () => frappe.model.can_amend(doctype)],
                ['Print',  () => frappe.model.can_print(doctype)],
                ['Email',  () => frappe.model.can_email(doctype)],
                ['Export', () => frappe.model.can_export(doctype)],
                ['Import', () => frappe.model.can_import(doctype)],
            ];

            let rows = '';
            for (const [label, fn] of CHECKS) {
                let has = false;
                try { has = !!fn(); } catch(_) {}
                rows += `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f5f5f5;font-size:11px"><span style="color:#68768a">${label}</span><span style="font-weight:700;color:${has ? '#21a366' : '#e74c3c'}">${has ? '✓' : '✗'}</span></div>`;
            }

            const panel = document.createElement('div');
            panel.id = panelId;
            panel.style.cssText = 'position:fixed;bottom:24px;left:24px;z-index:9998;background:#fff;border:1px solid #eaeff5;border-radius:12px;padding:14px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);width:190px;font-family:-apple-system,BlinkMacSystemFont,"Inter",sans-serif;';
            panel.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><span style="font-weight:700;font-size:12px">🔐 ${doctype}</span><span id="fp-perm-close" style="cursor:pointer;color:#aaa;font-size:15px;line-height:1">✕</span></div>${rows}<div style="margin-top:8px;font-size:9px;color:#aaa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${frappe.session.user}</div>`;
            document.body.appendChild(panel);
            document.getElementById('fp-perm-close').onclick = () => panel.remove();
        },

        getAvailableFields: function() {
             let fields = [], context = null, doctypeName = "Data";
             
             if (window.cur_dialog && $(window.cur_dialog.wrapper).is(':visible')) { 
                 context = window.cur_dialog; 
                 fields = window.cur_dialog.fields.map(f => f.df || f);
                 doctypeName = "Dialog"; 
             } else if (window.cur_frm) { 
                 context = window.cur_frm; 
                 fields = window.cur_frm.meta.fields; 
                 doctypeName = window.cur_frm.doctype; 
             }
             
             if (!fields) return { fields: [], doctype: doctypeName };

             const GARBAGE_REGEX = /^(sec_break|col_break|tab_break|column_break|section_break|spacer_|header_|__)/i;
             const IGNORED_TYPES = [
                 'Section Break', 'Column Break', 'Tab Break', 'HTML', 
                 'Spacer', 'Fold', 'Heading', 'Image'
             ];

             const mapped = fields.map(f => {
                if (IGNORED_TYPES.includes(f.fieldtype)) return null;
                if (!f.fieldname) return null; 
                if (GARBAGE_REGEX.test(f.fieldname)) return null;

                let val = '';
                try {
                    // Read from doc first — get_value() returns "" for read-mode
                    // forms where fields are rendered as text, not inputs.
                    if (context.doc && f.fieldname in context.doc) {
                        val = context.doc[f.fieldname];
                    } else if (context.get_value) {
                        val = context.get_value(f.fieldname);
                    }
                    if (val === null || val === undefined) val = '';
                    if (typeof val === 'object') val = ''; // skip Table arrays
                } catch(e) {
                    val = '';
                }

                let optStr = '';
                if (Array.isArray(f.options)) optStr = f.options.map(o => (typeof o === 'object' && o ? (o.label||o.value) : o)).join(',');
                else optStr = f.options || '';

                return { 
                    label: f.label || f.fieldname, 
                    fieldname: f.fieldname, 
                    fieldtype: f.fieldtype, 
                    options: optStr, 
                    value: val 
                };
             }).filter(f => f !== null);

             const docname = (context && context.doc && context.doc.name) ? context.doc.name : '';
             return { fields: mapped, doctype: doctypeName, docname: docname };
        }
    };

    window.addEventListener("message", (event) => {
        if (event.source !== window) return;
        if (event.data.type === "FRAPPE_PILOT_CONFIG") window.frappePilot.updateConfig(event.data.config);
        
        // FIX: Handle Clipboard Sync
        if (event.data.type === "FRAPPE_PILOT_CLIPBOARD_SYNC") {
            window.frappePilot.fieldClipboard = event.data.payload;
        }

        if (event.data.type === "FRAPPE_PILOT_GET_FIELDS") {
            try {
                const result = window.frappePilot.getAvailableFields();
                window.postMessage({ type: "FRAPPE_PILOT_FIELDS_DATA", payload: result }, "*");
            } catch(e) {
                // Always reply so the popup is never left stuck on "Scanning..."
                window.postMessage({ type: "FRAPPE_PILOT_FIELDS_DATA", payload: { fields: [], doctype: "Error" } }, "*");
            }
        }
        if (event.data.type === "FRAPPE_PILOT_RECEIVE_DOCS") {
            window.frappePilot.handlePasteData(event.data.payload);
        }
    });
})();