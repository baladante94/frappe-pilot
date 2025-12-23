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
    }, 1500);

    // --- 4. DATA ---
    const MOCK = {
        male: ["Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Rohan", "Rahul", "Amit", "Vikram"],
        female: ["Diya", "Saanvi", "Ananya", "Aditi", "Priya", "Neha", "Pooja", "Sneha", "Kavya"],
        last: ["Sharma", "Verma", "Gupta", "Malhotra", "Patel", "Singh", "Kumar", "Reddy"],
        biz: ["Apex", "Global", "Zenith", "Orbit", "Prime", "Elite", "Vertex", "Summit"],
        biz_suf: ["Technologies", "Logistics", "Solutions", "Enterprises", "Traders"],
        cities: ["Mumbai", "Bangalore", "Delhi", "Chennai", "Hyderabad", "Pune"]
    };

    // --- 5. MAIN CONTROLLER ---
    window.frappePilot = {
        config: { xray: false, magic: false, hidden_fields: false, teleport: true },
        fieldClipboard: null,
        burstInterval: null,
        keysSetup: false,

        updateConfig: function(newConfig) {
            const hiddenChanged = this.config.hidden_fields !== newConfig.hidden_fields;
            this.config = { ...this.config, ...newConfig };
            configLoaded = true;
            if(hiddenChanged) this.toggleHiddenFields(this.config.hidden_fields, false);
            else this.refreshState(false);
        },

        refreshState: function(silent) {
            // X-Ray
            if (this.config.xray) {
                document.body.classList.add('frappe-pilot-xray-active');
                this.startObserver();
                this.refreshXRay();
            } else {
                document.body.classList.remove('frappe-pilot-xray-active');
                document.querySelectorAll('.frappe-pilot-badge').forEach(el => el.remove());
                this.stopObserver();
            }
            // Hidden
            if(this.config.hidden_fields) this.toggleHiddenFields(true, true);
            // Teleport
            this.injectTeleportButton();
            // Magic Keys
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
                    e.preventDefault(); 
                    e.stopPropagation();
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
                for (let m of mutations) {
                     if (m.type === 'childList' && m.addedNodes.length > 0) shouldUpdate = true;
                }
                
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
            document.querySelectorAll('.frappe-pilot-badge').forEach(b => {
                 if(!document.body.contains(b)) b.remove();
            });

            const controls = document.querySelectorAll('[data-fieldname]');
            const GARBAGE_REGEX = /^(sec_break|col_break|tab_break|column_break|section_break|spacer_|header_|__)/i;
            const IGNORED_TYPES = ['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Fold', 'Spacer', 'Heading', 'Image'];

            controls.forEach(control => {
                let fieldname = control.getAttribute('data-fieldname');
                if (!fieldname) return;
                
                const existingBadge = control.querySelector('.frappe-pilot-badge') || 
                                      (control.nextSibling && control.nextSibling.classList && control.nextSibling.classList.contains('frappe-pilot-badge') ? control.nextSibling : null);

                if (GARBAGE_REGEX.test(fieldname)) return;
                if (control.classList.contains('section-break') || 
                    control.classList.contains('col-break') ||
                    control.classList.contains('column-break') ||
                    control.classList.contains('tab-break')) return;
                if (control.closest('.grid-row') && !control.closest('.grid-row-open')) return;

                let fieldDef = this.findFieldDef(fieldname, control);
                if (fieldDef && IGNORED_TYPES.includes(fieldDef.fieldtype)) return;

                if (existingBadge) {
                    if (existingBadge.getAttribute('data-incomplete') === 'true' && fieldDef) {
                         existingBadge.remove();
                    } else {
                        return;
                    }
                }
                this.renderBadge(control, fieldDef, fieldname);
            });
        },

        findFieldDef: function(fieldname, control) {
            if (window.cur_dialog && window.cur_dialog.wrapper.is(':visible')) {
                if (window.cur_dialog.fields) {
                    const found = window.cur_dialog.fields.find(f => f.fieldname === fieldname);
                    if (found) return found.df || found;
                }
                if (window.cur_dialog.fields_dict && window.cur_dialog.fields_dict[fieldname]) {
                    return window.cur_dialog.fields_dict[fieldname].df;
                }
            }
            if (window.cur_frm) {
                 const gridRowOpen = control ? control.closest('.grid-row-open') : null;
                 if (gridRowOpen) {
                    const gridWrapper = gridRowOpen.closest('.form-grid');
                    if (gridWrapper) {
                        const allFields = window.cur_frm.meta.fields.filter(f => f.fieldtype === 'Table');
                        let parentTableField = null;
                        for (let tf of allFields) {
                            if (gridWrapper.closest(`[data-fieldname="${tf.fieldname}"]`)) {
                                parentTableField = tf;
                                break;
                            }
                        }
                        if (parentTableField && parentTableField.options) {
                            return frappe.meta.get_docfield(parentTableField.options, fieldname);
                        }
                    }
                 }
            }
            if (window.cur_frm) {
                let found = frappe.meta.get_docfield(window.cur_frm.doctype, fieldname);
                if (found) return found;
                if (window.cur_frm.fields_dict && window.cur_frm.fields_dict[fieldname]) {
                    return window.cur_frm.fields_dict[fieldname].df;
                }
            }
            return null;
        },

        renderBadge: function(control, fieldDef, fallbackName) {
            if (fieldDef && fieldDef.df) fieldDef = fieldDef.df;

            const badge = document.createElement('span');
            badge.className = 'frappe-pilot-badge';
            if (!fieldDef) {
                badge.setAttribute('data-incomplete', 'true');
            }

            badge.style.display = 'inline-flex';
            badge.style.alignItems = 'center';
            badge.style.gap = '6px';
            badge.style.marginLeft = '10px';
            badge.style.alignSelf = 'center'; 
            badge.style.whiteSpace = 'nowrap';
            badge.style.maxWidth = '100%';

            let fName = fieldDef ? fieldDef.fieldname : fallbackName;
            let fType = fieldDef ? fieldDef.fieldtype : '';
            
            let fOpts = '';
            if (fieldDef && fieldDef.options) {
                if (Array.isArray(fieldDef.options)) {
                    fOpts = fieldDef.options.map(o => {
                        if (typeof o === 'object' && o !== null) return o.label || o.value || '';
                        return o;
                    }).join(', ');
                } else {
                    fOpts = String(fieldDef.options);
                }
            }

            const textSpan = document.createElement('span');
            textSpan.className = 'fp-badge-text';
            textSpan.style.cursor = 'copy';
            textSpan.style.maxWidth = '250px';
            textSpan.style.overflow = 'hidden';
            textSpan.style.textOverflow = 'ellipsis';
            textSpan.style.display = 'block';
            
            let meta = fType;
            if (fOpts) {
                let cleanOpts = fOpts.replace(/\n/g, ', ');
                if (cleanOpts.length > 25) cleanOpts = cleanOpts.substring(0, 22) + '...';
                meta += ` : ${cleanOpts}`;
            }
            textSpan.innerHTML = `<b>${fName}</b> <span style="opacity:0.6">| ${meta}</span>`;
            
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
                iconSpan.style.cursor = 'pointer';
                iconSpan.style.flexShrink = '0';
                iconSpan.title = "Copy Value";
                iconSpan.onclick = (e) => {
                    e.preventDefault(); e.stopPropagation();
                    let def = fieldDef || { fieldname: fName, fieldtype: fType || 'Data', label: fName };
                    this.handleFieldAction(def, control); 
                };
                badge.appendChild(iconSpan);
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
            if(!target && control.closest('.grid-row-open')) {
                 target = control.closest('.form-group')?.querySelector('.control-label');
            }

            if(target && !target.querySelector('.frappe-pilot-badge')) {
                badge.style.marginLeft = '8px';
                target.appendChild(badge);
            }
        },

        handleFieldAction: function(fieldDef, control) {
            let context = window.cur_dialog && window.cur_dialog.wrapper.is(':visible') ? window.cur_dialog : window.cur_frm;
            if(!context) return;

            const storedClip = localStorage.getItem('fp_field_clipboard');
            const hasClip = storedClip !== null;
            let options = [];

            options.push({
                label: `Copy ${fieldDef.fieldtype === 'Table' ? 'Selected Rows' : 'Value'}`,
                action: () => this.copyFieldData(fieldDef, context, control)
            });

            if (hasClip) {
                let clipData = JSON.parse(storedClip);
                let typeInfo = clipData.type === 'rows' ? `(${clipData.value.length} rows)` : `(Value)`;
                options.push({
                    label: `Paste ${typeInfo}`,
                    action: () => this.pasteFieldData(fieldDef, context, clipData)
                });
            }

            let d = new frappe.ui.Dialog({
                title: `${fieldDef.label || fieldDef.fieldname}`,
                width: 300,
                fields: [{
                    fieldtype: 'HTML',
                    options: `<div style="padding:5px 0;">${options.map(o => `<button class="btn btn-default btn-block btn-sm" style="margin-bottom:5px; text-align:left;" data-label="${o.label}">${o.label}</button>`).join('')}</div>`
                }]
            });

            d.show();
            d.$wrapper.find('button').on('click', function() {
                let label = $(this).attr('data-label');
                let opt = options.find(o => o.label === label);
                try { if(opt) opt.action(); } 
                catch(e) { frappe.msgprint("Error: " + e.message); } 
                finally { d.hide(); }
            });
        },

        copyFieldData: function(fieldDef, context, control) {
            let val = null;
            let type = 'value';

            if (fieldDef.fieldtype === 'Table') {
                if (context.fields_dict[fieldDef.fieldname]?.grid) {
                    val = context.fields_dict[fieldDef.fieldname].grid.get_selected_children();
                    if(!val || val.length === 0) throw new Error("Select rows first.");
                    type = 'rows';
                }
            } 
            else {
                const gridRow = $(control).closest('.grid-row');
                if (gridRow.length) {
                    const docName = gridRow.attr('data-name');
                    const cdt = gridRow.attr('data-doctype');
                    if (docName && cdt) {
                        if (locals[cdt] && locals[cdt][docName]) {
                            val = locals[cdt][docName][fieldDef.fieldname];
                        } 
                        if (val === undefined || val === null) {
                            val = frappe.model.get_value(cdt, docName, fieldDef.fieldname);
                        }
                    } 
                } 
                else {
                    if (context.doc && context.doc[fieldDef.fieldname] !== undefined) {
                        val = context.doc[fieldDef.fieldname];
                    } else if (typeof context.get_value === 'function') {
                        val = context.get_value(fieldDef.fieldname);
                    }
                }
            }

            if (val === null || val === undefined || val === "") throw new Error("Value is empty.");
            
            localStorage.setItem('fp_field_clipboard', JSON.stringify({ type, value: val }));
            frappe.show_alert(`📋 Copied ${type === 'rows' ? val.length + ' rows' : 'value'}.`);
        },

        pasteFieldData: function(fieldDef, context, clipData) {
            if (clipData.type === 'rows') {
                if (fieldDef.fieldtype !== 'Table') { frappe.msgprint("Can only paste rows into a Table."); return; }
                let rows = clipData.value;
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
            localStorage.removeItem('fp_field_clipboard');
        },

        // ============================================================
        //  FEATURE 2: MAGIC FILLER (STRICT MANDATORY ONLY)
        // ============================================================
        fillMagicData: async function() {
            frappe.show_alert('🪄 Magic Filler (Mandatory Only)...', 1);
            let context = window.cur_dialog && window.cur_dialog.wrapper.is(':visible') ? window.cur_dialog : window.cur_frm;
            if(!context) { frappe.msgprint("No active form."); return; }
            
            let fields = [];
            if (context.fields) {
                fields = context.fields.map(f => f.df || f);
            } else if (context.meta && context.meta.fields) {
                fields = context.meta.fields;
            }

            let isIndividual = false;
            try { if (context.doc && (context.doc.customer_type === 'Individual' || ['Lead','Patient','User'].includes(context.doctype))) isIndividual = true; } catch(e) {}

            let firstName, lastName, fullName, gender, email;
            if (isIndividual) {
                gender = Math.random() > 0.5 ? "Male" : "Female";
                firstName = gender === "Male" ? MOCK.male[Math.floor(Math.random()*MOCK.male.length)] : MOCK.female[Math.floor(Math.random()*MOCK.female.length)];
                lastName = MOCK.last[Math.floor(Math.random()*MOCK.last.length)];
                fullName = `${firstName} ${lastName}`;
                email = `${firstName.toLowerCase()}@example.com`;
            } else {
                let pre = MOCK.biz[Math.floor(Math.random()*MOCK.biz.length)];
                let suf = MOCK.biz_suf[Math.floor(Math.random()*MOCK.biz_suf.length)];
                fullName = `${pre} ${suf}`; firstName = pre; lastName = suf;
                email = `contact@${pre.toLowerCase()}.com`; gender = null;
            }
            let mobile = "9" + Math.floor(100000000 + Math.random() * 900000000); 

            let count = 0;
            for (let field of fields) {
                if (!field || field.hidden || field.read_only || !field.fieldname) continue;
                if (['Section Break', 'Column Break', 'HTML', 'Tab Break', 'Button'].includes(field.fieldtype)) continue;

                // STRICT: ONLY MANDATORY FIELDS
                if (field.reqd !== 1) continue;

                if (['naming_series', 'company'].includes(field.fieldname)) continue;

                const fname = field.fieldname.toLowerCase();
                let val = null;
                
                if (fname.includes('mobile') || fname.includes('phone') || field.fieldtype === 'Phone') val = mobile;
                else if (fname.includes('email')) val = email;
                else if (fname === 'customer_name' || fname === 'supplier_name') val = fullName;
                else if (fname === 'company_name') val = isIndividual ? "Self" : fullName;
                else if (fname.includes('first_name')) val = firstName;
                else if (fname.includes('last_name')) val = lastName;
                else if (fname.includes('name') && (field.fieldtype === 'Data' || field.fieldtype === 'Dynamic Link')) val = fullName;
                else if (fname.includes('gender') || fname.includes('sex')) val = isIndividual ? gender : null;
                else if (fname.includes('city')) val = MOCK.cities[Math.floor(Math.random()*MOCK.cities.length)];
                else if (field.fieldtype === 'Date') val = frappe.datetime.get_today();
                else if (field.fieldtype === 'Select' && field.options) {
                     let opts = [];
                     if (Array.isArray(field.options)) opts = field.options;
                     else if (typeof field.options === 'string') opts = field.options.split('\n');
                     
                     opts = opts.filter(o => o && (typeof o === 'string' ? o.trim() !== '' : true)); 
                     if (opts.length > 0) {
                        let rand = opts[Math.floor(Math.random()*opts.length)];
                        val = (typeof rand === 'object' && rand.value) ? rand.value : rand;
                     }
                }
                else if (field.fieldtype === 'Link') {
                     if (!fname.includes('type') && !fname.includes('group')) {
                         try { let r = await frappe.db.get_list(field.options, { limit: 5 }); if (r.length) val = r[Math.floor(Math.random()*r.length)].name; } catch(e) {}
                     }
                }

                if (val !== null) {
                    if (window.cur_dialog && window.cur_dialog.wrapper.is(':visible')) window.cur_dialog.set_value(field.fieldname, val);
                    else window.cur_frm.set_value(field.fieldname, val);
                    count++;
                }
            }
            frappe.show_alert(`🪄 Filled ${count} mandatory fields.`);
        },

        // ============================================================
        //  FEATURE 3: HIDDEN FIELDS
        // ============================================================
        toggleHiddenFields: function(enable, silent) {
            if (!silent && window.cur_frm) {
                if(enable) frappe.show_alert('👁️ Revealing hidden fields...');
                else frappe.show_alert('🙈 Hiding fields...');
            }
            const process = (field) => {
                if (!field || !field.df) return;
                
                if (enable) {
                    if (field.df.hidden) {
                        field.df.hidden = 0; field.__fp_was_hidden = true; field.refresh();
                        const label = $(field.wrapper).find('.control-label');
                        if (label.length && !label.find('.fp-hidden-tag').length) label.append('<span class="fp-hidden-tag" style="color:#e24c4c; font-size:9px; margin-left:6px; background:#fff0f0; padding:1px 4px; border-radius:3px;">(Hidden)</span>');
                        $(field.wrapper).css('border-left', '3px solid #ffcc00');
                    }
                } else if (field.__fp_was_hidden) {
                    field.df.hidden = 1; delete field.__fp_was_hidden; field.refresh();
                    $(field.wrapper).css('border-left', 'none');
                }
            };
            if (window.cur_frm && window.cur_frm.fields_dict) $.each(window.cur_frm.fields_dict, (fn, f) => process(f));
            if (window.cur_dialog && window.cur_dialog.wrapper.is(':visible')) $.each(window.cur_dialog.fields_dict, (fn, f) => process(f));
        },

        // ============================================================
        //  FEATURE 4: TELEPORT
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
            
            btnGroup.innerHTML = `<button class="btn btn-secondary btn-default dropdown-toggle" data-toggle="dropdown" style="color:var(--primary); font-weight:600; display:flex; align-items:center;"><span class="icon icon-sm" style="margin-right:4px;"><svg class="icon icon-sm" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></span>Teleport</button><ul class="dropdown-menu"><li><a class="dropdown-item" id="fp-save-docs">📋 Copy Selected</a></li><li><a class="dropdown-item" id="fp-insert-docs">📥 Paste Docs</a></li><li class="divider"></li><li><a class="dropdown-item" id="fp-export-csv">📊 CSV Export</a></li></ul>`;
            anchor.prepend(btnGroup);
            document.getElementById('fp-save-docs').onclick = () => this.teleportCopy();
            document.getElementById('fp-insert-docs').onclick = () => this.teleportPaste();
            document.getElementById('fp-export-csv').onclick = () => this.exportCSV();
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
            if (window.cur_list.doctype !== docs[0].doctype) { frappe.msgprint(`⚠️ Mismatch! Clipboard: ${docs[0].doctype}`); return; }
            
            frappe.confirm(`Insert ${docs.length} records?`, async () => {
                frappe.show_alert('🚀 Processing...');
                let localCompany = frappe.defaults.get_user_default("Company") || frappe.defaults.get_default("company");
                let success = 0;
                for (let doc of docs) {
                    let newDoc = this.cleanDoc(doc, localCompany);
                    if (await this.insertWithRetry(newDoc)) success++;
                }
                if (success > 0) { frappe.msgprint(`✅ Inserted ${success}.`); window.cur_list.refresh(); }
            });
        },

        insertWithRetry: async function(doc) {
            try { await frappe.db.insert(doc); return true; } 
            catch (e) {
                let msg = e.message;
                try { if (e._server_messages) msg = JSON.parse(JSON.parse(e._server_messages)[0]).message; } catch(err) {}
                
                return await new Promise((resolve) => {
                    let d = new frappe.ui.Dialog({
                        title: 'Insert Failed',
                        fields: [{ fieldtype: 'HTML', options: `<div style="padding:10px; color:red; font-size:12px">${msg}</div><p>Fix manually & Retry.</p>` }],
                        primary_action_label: 'Retry',
                        primary_action: async () => { d.hide(); resolve(await this.insertWithRetry(doc)); },
                        secondary_action_label: 'Skip',
                        secondary_action: () => { d.hide(); resolve(false); }
                    });
                    d.show();
                });
            }
        },

        cleanDoc: function(doc, localCompany) {
            let d = JSON.parse(JSON.stringify(doc));
            const strip = ['name', 'owner', 'creation', 'modified', 'modified_by', 'docstatus', 'idx', 'parent', 'parentfield', 'parenttype', 'workflow_state', 'amended_from', '_user_tags', '_comments', '_assign', '_liked_by', 'lft', 'rgt', 'old_parent', 'is_group'];
            strip.forEach(k => delete d[k]);
            if (d.company && localCompany) d.company = localCompany;
            return d;
        },

        exportCSV: function() {
            if(!window.cur_list) return;
            const url = `/api/method/frappe.desk.reportview.export_query?file_format_type=CSV&doctype=${window.cur_list.doctype}&view=List&cmd=frappe.desk.reportview.export_query`;
            window.open(url, '_blank');
        },

        // ============================================================
        //  FEATURE 5: DATA EXTRACTION
        // ============================================================
        getAvailableFields: function() {
             let fields = [], context = null, doctypeName = "Data";
             
             if (window.cur_dialog && window.cur_dialog.wrapper.is(':visible')) { 
                 context = window.cur_dialog; 
                 // FIX: Normalize
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
                    if (context.get_value) val = context.get_value(f.fieldname); 
                } catch(e) {}

                // FIX: Handle Array Options
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

             return { fields: mapped, doctype: doctypeName };
        }
    };

    // --- EVENTS ---
    window.addEventListener("message", (event) => {
        if (event.source !== window) return;
        if (event.data.type === "FRAPPE_PILOT_CONFIG") window.frappePilot.updateConfig(event.data.config);
        if (event.data.type === "FRAPPE_PILOT_GET_FIELDS") {
            const result = window.frappePilot.getAvailableFields();
            window.postMessage({ type: "FRAPPE_PILOT_FIELDS_DATA", payload: result }, "*");
        }
        if (event.data.type === "FRAPPE_PILOT_RECEIVE_DOCS") {
            window.frappePilot.handlePasteData(event.data.payload);
        }
    });
})();