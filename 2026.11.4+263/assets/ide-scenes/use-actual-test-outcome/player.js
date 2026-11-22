/* A generic state renderer. Scenario actions are compiled in Python. */
(() => {
  'use strict';
  const make = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  class Player {
    constructor(root) {
      this.root = root;
      this.pointerHistory=new Map();
      this.uid="ide-player-"+[...document.querySelectorAll("[data-ide-scenes]")].indexOf(root);
      this.data = JSON.parse(root.querySelector('.is-data').textContent);
      this.index = 0;
      this.time = 0;
      this.frameIndex = -1;
      this.playing = false;
      this.raf = null;
      this.viewFile = null;
      this.stopAt = null;
      this.panelViews = {};
      this.settingsQuery=null;
      this.groupViews={};
      this.motion = matchMedia('(prefers-reduced-motion: reduce)');
      this.q = selector => root.querySelector(selector);
      this.q('.is-player').hidden = false;
      this.pointerHost=make('div','is-mouse');this.pointerHost.hidden=true;this.pointerHost.setAttribute('aria-hidden','true');
      this.pointerHost.innerHTML='<svg width="22" height="28" viewBox="0 0 22 28"><path d="M2 2v21l5-5 4 8 4-2-4-8h8z" fill="white" stroke="#171717" stroke-width="1.8" stroke-linejoin="round"/></svg><span class="is-mouse-ring"></span>';
      this.q('.is-window').append(this.pointerHost);
      this.copyHost=make('div','is-copy-feedback');this.copyHost.setAttribute('aria-live','polite');
      this.q('.is-window').after(this.copyHost);
      const fileControls=make('div','is-file-controls');this.q('.is-file-tabs').before(fileControls);
      this.mainCopyButton=this.makeCopyButton(()=>this.state.files[this.viewFile||this.state.active_file]);
      fileControls.append(this.q('.is-file-tabs'),this.mainCopyButton);
      this.modalHost = make('div', 'is-modal-host');
      this.modalHost.hidden = true;
      this.candidateHost=make('div','is-candidates');
      this.candidateHost.hidden=true;
      this.q('.is-editor').append(this.candidateHost);
      this.documentHost=make('section','is-documentation');
      this.documentHost.hidden=true;
      this.q('.is-editor').append(this.documentHost);
      this.clipboardHost=make('aside','is-clipboard');
      this.q('.is-window').after(this.clipboardHost);
      this.transactionHost=make('section','is-transaction');
      this.q('.is-center').append(this.transactionHost);
      this.environmentHost=make('div','is-environment');
      this.q('.is-titlebar').after(this.environmentHost);
      this.settingsHost=make('section','is-settings');this.transcriptHost=make('section','is-transcript');
      this.q('.is-center').append(this.settingsHost,this.transcriptHost);
      this.groupsHost=make('div','is-editor-groups');this.q('.is-file-controls').before(this.groupsHost);
      this.q('.is-window').append(this.modalHost);
      this.q('.is-project-toggle').addEventListener('click', () => {
        const tree = this.q('.is-tree');
        tree.hidden = !tree.hidden;
        this.q('.is-project-toggle').setAttribute('aria-expanded', String(!tree.hidden));
        this.positionMenu();
      });
      this.editorResize = new ResizeObserver(() => this.positionMenu());
      this.editorResize.observe(this.q('.is-editor'));
      this.root.addEventListener('scroll', () => this.positionMenu(), true);
      window.addEventListener('resize', () => this.positionMenu());
      document.fonts.ready.then(() => {this.reserveSceneHeight();});
      this.editorResize.observe(this.q('.is-window'));
      this.q('.is-fallback').open = false;
      this.tabs = this.data.map((scene, i) => {
        const tab = make('button', '', scene.title);
        tab.id = `${this.uid}-scenario-${scene.id}`;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', this.uid+'-scene-panel');
        tab.addEventListener('click', () => this.select(i));
        tab.addEventListener('keydown', event => {
          const keys = {ArrowRight: (i + 1) % this.data.length, ArrowLeft: (i + this.data.length - 1) % this.data.length, Home: 0, End: this.data.length - 1};
          if (!(event.key in keys)) return;
          event.preventDefault();
          this.select(keys[event.key]);
          this.tabs[this.index].focus();
        });
        this.q('.is-scenarios').append(tab);
        return tab;
      });
      this.q('.is-window').id = this.uid+'-scene-panel';
      this.q('.is-tree').id=this.uid+'-project-tree';
      this.q('.is-project-toggle').setAttribute('aria-controls',this.uid+'-project-tree');
      this.q('.is-window').setAttribute('role', 'tabpanel');
      root.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'play') this.playing ? this.pause() : this.play();
        if (action === 'reset') { this.pause(); this.seek(0); }
        if (action === 'previous') this.step(-1);
        if (action === 'next') this.step(1);
      }));
      this.q('input[type=range]').addEventListener('input', event => { this.pause(); this.seek(Number(event.target.value)); });
      this.motion.addEventListener('change', () => {
        this.pause();
        this.q('.is-motion-note').hidden = !this.motion.matches;
        this.updatePointer();
      });
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) this.pause(); });
        this.observer.observe(root);
      }
      this.speed = 1;
      if (root.classList.contains("is-compact")) this.compactControls();
      this.select(0);
      root.player = this;
      this.q('.is-motion-note').hidden = !this.motion.matches;
      // The embed host only accepts messages from this exact iframe window.
      const reportSize = () => {
        if (window.parent !== window) window.parent.postMessage({type: 'ide-scenes:resize', height: Math.ceil(root.getBoundingClientRect().height)}, '*');
      };
      window.addEventListener('message', event => {
        if (event.source === window.parent && event.origin === location.origin && event.data?.type === 'ide-scenes:host-ready') reportSize();
      });
      this.resizeObserver = new ResizeObserver(reportSize);
      this.resizeObserver.observe(root);
      let measuredWidth=root.getBoundingClientRect().width;
      this.widthObserver=new ResizeObserver(()=>{
        const width=root.getBoundingClientRect().width;
        if(width===measuredWidth)return;
        measuredWidth=width;
        this.reserveSceneHeight();
      });
      this.widthObserver.observe(root);
    }
    compactControls() {
      this.q('.is-fallback').hidden = window.parent !== window;
      const controls=this.q('.is-controls');
      this.q('.is-window').after(controls);
      const options=make('div','is-playback-options');
      const toggle=make('button','is-options-toggle','⋯');
      toggle.setAttribute('aria-label','Playback options');
      toggle.setAttribute('aria-expanded','false');
      const flyout=make('div','is-options-flyout');
      flyout.id=this.uid+'-options';flyout.hidden=true;
      toggle.setAttribute('aria-controls',flyout.id);
      const close=(focus=false)=>{flyout.hidden=true;toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus();};
      toggle.addEventListener('click',()=>{const open=flyout.hidden;flyout.hidden=!open;toggle.setAttribute('aria-expanded',String(open));});
      for(const action of ['reset','previous','next']) {
        const button=this.q('[data-action='+action+']');
        if(action==='reset') button.textContent='Back to start';
        flyout.append(button);
        button.addEventListener('click',()=>close(true));
      }
      const replay=make('button','','Replay');
      replay.addEventListener('click',()=>{this.seek(0);this.play();close(true);});
      flyout.prepend(replay);
      const speedLabel=make('label','','Speed');
      const speed=make('select');speed.setAttribute('aria-label','Playback speed');
      for(const value of [0.5,1,1.5,2]) {const option=make('option','',value+'×');option.value=value;option.selected=value===1;speed.append(option);}
      speed.addEventListener('change',()=>{const playing=this.playing;this.pause();this.speed=Number(speed.value);if(playing)this.play();});
      speedLabel.append(speed);flyout.append(speedLabel,this.q('.is-time'));
      options.append(toggle,flyout);controls.append(options);
      options.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close(true);}});
      options.addEventListener('focusout',event=>{if(!options.contains(event.relatedTarget))close();});
      document.addEventListener('pointerdown',event=>{if(!options.contains(event.target))close();});
      this.q('.is-seek').firstChild.textContent='';
      const chooser=make('div','is-mobile-scenarios');
      const select=make('select');select.setAttribute('aria-label','Feature presentation');
      this.data.forEach((scene,index)=>{const option=make('option','',scene.title);option.value=index;select.append(option);});
      select.addEventListener('change',()=>this.select(Number(select.value)));
      this.sceneSelect=select;this.sceneCount=make('span');
      chooser.append(select,this.sceneCount);this.q('.is-scenarios').after(chooser);
    }
    playLabel(label) {
      const button=this.q('[data-action=play]');
      button.setAttribute('aria-label',label);
      button.title=label;
      button.textContent=this.root.classList.contains('is-compact') ? ({Play:'▶',Pause:'Ⅱ',Replay:'↻'}[label]) : label;
    }
    get scene() {
      const root = this.data[this.index];
      return this.branch ? {...root, ...root.branches[this.branch], token_streams: root.token_streams} : root;
    }
    choose(outcome) {
      const decision = this.state.decision;
      const key = decision?.outcomes[outcome];
      if (!key) return false;
      const priorTime = this.time;
      this.pause();
      this.branch = key;
      this.frameIndex = -1;
      this.q('input[type=range]').max = this.scene.duration;
      // Default continuation shows the remaining form edits; alternatives start
      // at their fork and never pass through the default source changes.
      const first = this.scene.frames.find(frame => frame.time > this.scene.entry);
      this.seek(outcome === decision.default ? priorTime : (first?.time ?? this.scene.duration));
      this.play();
      return true;
    }
    dismiss() {
      const key = this.scene.frames[this.frameIndex].dismiss;
      if (!key) return;
      this.pause();
      this.branch = key;
      this.frameIndex = -1;
      this.q('input[type=range]').max = this.scene.duration;
      this.seek(this.scene.duration);
      this.q('[data-action=play]').focus({preventScroll: true});
    }
    playSegment(name) {
      const segment = this.scene.segments[name];
      if (!segment) throw new Error('Unknown segment: ' + name);
      this.seek(segment.start);
      this.play(segment.end);
    }
    select(index) {
      this.pause();
      this.index = index;
      if(this.sceneSelect){this.sceneSelect.value=index;this.sceneCount.textContent=(index+1)+' of '+this.data.length;}
      this.pointerHistory.clear();
      this.branch = null;
      this.frameIndex = -1;
      this.viewFile = null;
      this.q('.is-tree').hidden = true;
      this.q('.is-project-toggle').setAttribute('aria-expanded', 'false');
      this.tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
      });
      this.q('.is-window').setAttribute('aria-labelledby', this.tabs[index].id);
      this.q('h1').textContent = this.scene.title;
      this.q('.is-heading p').textContent = this.scene.description;
      const link = this.q('.is-doc-link');
      link.hidden = !this.scene.link;
      if (this.scene.link) { link.href = this.scene.link; link.target = '_top'; }
      this.q('input[type=range]').max = this.scene.duration;
      this.q('.is-project-title').textContent = this.scene.layout.project;
      this.seek(0);
      this.reserveSceneHeight();
    }
    seek(ms, fromClock = false) {
      if (!Number.isFinite(ms)) throw new TypeError('time must be finite');
      if (!fromClock) { this.pause(); this.stopAt = null; this.frameIndex = -1; this.panelViews = {}; this.candidateView = null; this.groupViews={}; this.settingsQuery=null; }
      if (this.viewFile) { this.viewFile = null; this.frameIndex = -1; }
      this.time = Math.max(0, Math.min(this.scene.duration, ms));
      let lo = 0, hi = this.scene.frames.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (this.scene.frames[mid].time <= this.time) lo = mid + 1; else hi = mid;
      }
      const index = Math.max(0, lo - 1);
      if (index !== this.frameIndex) { this.frameIndex = index; this.panelViews = {}; this.candidateView = null; this.groupViews={}; this.settingsQuery=null; this.render(this.scene.frames[index].state); }
      this.q('input[type=range]').value = Math.round(this.time);
      this.q('.is-time').textContent = `${(this.time / 1000).toFixed(1)} / ${(this.scene.duration / 1000).toFixed(1)}s`;
      this.q('[data-action=previous]').disabled = this.time === 0;
      this.q('[data-action=next]').disabled = this.time === this.scene.duration;
      this.updatePointer();
      if (!this.playing) this.playLabel(this.time === this.scene.duration ? 'Replay' : 'Play');
    }
    step(direction) {
      this.pause();
      const times = this.scene.boundaries;
      const target = direction > 0 ? times.find(t => t > this.time) : [...times].reverse().find(t => t < this.time);
      this.seek(target ?? (direction > 0 ? this.scene.duration : 0));
    }
    play(stopAt = null) {
      if (this.viewFile) { this.viewFile = null; this.frameIndex = -1; this.seek(this.time); }
      if (this.motion.matches) { this.seek(stopAt ?? this.scene.duration); return; }
      if (this.time === this.scene.duration) this.seek(0);
      this.stopAt = stopAt;
      this.playing = true;
      this.playLabel('Pause');
      this.q('.is-caption').setAttribute('aria-live', 'off');
      const start = performance.now() - this.time / this.speed;
      const tick = now => {
        if (!this.playing) return;
        const end = this.stopAt ?? this.scene.duration;
        this.seek(Math.min((now - start) * this.speed, end), true);
        if (this.time >= end) this.pause();
        else this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
    pause() {
      cancelAnimationFrame(this.raf);
      this.playing = false;
      this.playLabel(this.time === this.scene.duration ? 'Replay' : 'Play');
      this.q('.is-caption').setAttribute('aria-live', 'polite');
    }
    browseFile(name) {
      this.pause();
      this.viewFile = name;
      const state = this.scene.frames[this.frameIndex].state;
      this.render(state);
    }
    render(state) {
      this.state = state;
      if (this.viewFile && !(this.viewFile in state.files)) this.viewFile=null;
      if (this.viewFile) state = {...state, active_file: this.viewFile, menu: null};
      const tree = this.q('.is-tree');
      tree.replaceChildren(make('strong', '', 'Project'), make('p', '', this.scene.layout.project));
      const tabs = this.q('.is-file-tabs');
      tabs.replaceChildren();
      const folders=new Map([['',tree]]);
      (state.directories||[]).forEach(path=>{
        const parent=path.includes('/')?path.slice(0,path.lastIndexOf('/')):'';
        const folder=make('details','is-project-folder');folder.open=true;
        folder.append(make('summary','',path.split('/').at(-1)+(state.source_roots?.includes(path)?' · source root':'')));
        (folders.get(parent)||tree).append(folder);folders.set(path,folder);
      });
      Object.keys(state.files).forEach(name => {
        const path=state.file_paths?.[name]||name;
        const fileButton = make('button', name === state.active_file ? 'is-active-file' : '', path);
        fileButton.addEventListener('click', () => this.browseFile(name));
        const parent=path.includes('/')?path.slice(0,path.lastIndexOf('/')):'';
        (folders.get(parent)||tree).append(fileButton);
        const tab = make('button', name === state.active_file ? 'is-active-file' : '', path);
        tab.dataset.fileId=name;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', String(name === state.active_file));
        tab.tabIndex = name === state.active_file ? 0 : -1;
        tab.addEventListener('click', () => { this.browseFile(name); this.focusFileTab(name); });
        tab.addEventListener('keydown', event => {
          const names = Object.keys(state.files), index = names.indexOf(name);
          const targets = {ArrowRight: (index + 1) % names.length, ArrowLeft: (index + names.length - 1) % names.length, Home: 0, End: names.length - 1};
          if (!(event.key in targets)) return;
          event.preventDefault();
          const target = names[targets[event.key]];
          this.browseFile(target);
          this.focusFileTab(target);
        });
        tabs.append(tab);
      });
      this.renderCode(state);
      this.renderGroups(state);
      this.renderMenu(state.menu);
      this.renderModal(state.modal);
      this.renderCandidates(state.completion || state.chooser);
      this.renderDocument(state.documentation);
      this.renderClipboard(state.clipboard,state.notification);
      this.renderTransaction(state);
      this.renderSpecialized(state);
      const diagnostics = this.q('.is-diagnostics');
      diagnostics.replaceChildren();
      state.diagnostics.filter(d => d.file === state.active_file).forEach(d => diagnostics.append(make('p', `is-diagnostic-${d.severity}`, d.message)));
      ['left', 'right', 'bottom'].forEach(position => this.q(`.is-panels-${position}`).replaceChildren());
      Object.values(state.panels).filter(p => p.visible).forEach(panel => {
        const article = this.renderPanel(panel);
        this.q(`.is-panels-${panel.position}`).append(article);
      });
      this.mainCopyButton.hidden=!state.active_file;
      this.q('.is-caption').textContent = state.caption;
      this.positionMenu();
    }
    updatePanelView(id, change, focusKey) {
      this.pause();
      const view = this.panelViews[id] || this.state.panels[id].view;
      this.panelViews[id] = {...view, ...change};
      this.render(this.state);
      if (focusKey) [...this.root.querySelectorAll('[data-control-key]')]
        .find(el => el.dataset.controlKey === focusKey)?.focus({preventScroll:true});
    }
    renderPanel(panel) {
      const article = make('section', 'is-tool-panel is-' + panel.status);
      if(panel.kind==='tree') article.classList.add('is-tree-panel');
      article.setAttribute('aria-label', panel.title);
      article.setAttribute('role', 'region');
      article.dataset.panelId = panel.id;
      article.append(make('h2', '', panel.title));
      if (!panel.rows) {
        article.append(make('p', '', panel.text));
        return article;
      }
      const view = this.panelViews[panel.id] || panel.view;
      const toggle = (values, id) => values.includes(id) ? values.filter(v => v !== id) : [...values,id];
      if (panel.tabs.length) {
        const tabs = make('div','is-panel-tabs');
        tabs.setAttribute('role','tablist');
        tabs.setAttribute('aria-label',panel.title + ' tabs');
        panel.tabs.forEach(tab => {
          const button=make('button','',tab.label);
          button.setAttribute('role','tab'); button.setAttribute('aria-selected',String(view.tab===tab.id));
          button.dataset.controlKey=panel.id+'/tab/'+tab.id;
          const activate=target=>this.updatePanelView(panel.id,{tab:target.id},panel.id+'/tab/'+target.id);
          button.tabIndex=view.tab===tab.id?0:-1;
          button.addEventListener('click',()=>activate(tab));
          button.addEventListener('keydown',event=>{
            const i=panel.tabs.indexOf(tab), n=panel.tabs.length;
            const keys={ArrowRight:(i+1)%n,ArrowLeft:(i+n-1)%n,Home:0,End:n-1};
            if(event.key in keys) {event.preventDefault(); activate(panel.tabs[keys[event.key]]);}
          });
          tabs.append(button);
        });
        article.append(tabs);
      }
      const toolbar=make('div','is-panel-toolbar');
      toolbar.dataset.panelToolbar=panel.id;
      toolbar.setAttribute('role','group'); toolbar.setAttribute('aria-label',panel.title+' controls');
      panel.toolbar.forEach(control => {
        const button=make('button','',control.label);
        if(panel.kind==='tree') {
          button.textContent=control.kind==='sort'?'A↕':control.kind==='filter'?'◉':'↻';
          button.setAttribute('aria-label',control.label);
          button.title=control.label;
        }
        button.dataset.controlKey=panel.id+'/toolbar/'+control.id;
        button.disabled=control.disabled || (control.kind==='refresh' && !this.state.decision?.outcomes[control.outcome]);
        if(control.kind==='filter') button.setAttribute('aria-pressed',String(view.filters.includes(control.tag)));
        if(control.kind==='sort') button.setAttribute('aria-pressed',String(view.sort==='label'));
        button.addEventListener('click',()=>{
          if(control.kind==='refresh') { this.choose(control.outcome); return; }
          const change=control.kind==='filter' ? {filters:toggle(view.filters,control.tag)} : {sort:view.sort==='label'?'document':'label'};
          this.updatePanelView(panel.id,change,button.dataset.controlKey);
        });
        toolbar.append(button);
      });
      const query=make('input','is-panel-search');
      query.type='search'; query.value=view.query; query.placeholder='Filter results';
      query.setAttribute('aria-label','Filter '+panel.title);
      query.dataset.controlKey=panel.id+'/query';
      query.addEventListener('input',()=>{
        const caret=query.selectionStart;
        this.updatePanelView(panel.id,{query:query.value},query.dataset.controlKey);
        const replacement=[...this.root.querySelectorAll('[data-control-key]')].find(el=>el.dataset.controlKey===query.dataset.controlKey);
        if(replacement?.type==='search' && caret!==null) replacement.setSelectionRange(caret,caret);
      });
      toolbar.append(query); article.append(toolbar);
      const visible = rows => {
        let result=rows.flatMap(row=>{
          if ((row.tags||[]).some(tag=>view.filters.includes(tag)) || (row.tab && row.tab!==view.tab)) return [];
          const children=visible(row.children||[]);
          const matches=row.label.toLocaleLowerCase().includes(view.query.toLocaleLowerCase());
          if(view.query && !matches && !children.length) return [];
          if(row.children?.length && !children.length && !view.query) return [];
          return [{...row,children}];
        });
        if(view.sort==='label') result.sort((a,b)=>a.label.localeCompare(b.label));
        return result;
      };
      const rows=visible(panel.rows);
      const container=make('div','is-panel-results');
      container.setAttribute('role',panel.kind==='tree'?'tree':panel.kind==='table'?'table':'list');
      container.setAttribute('aria-label',panel.title+' results');
      if(panel.kind==='tree') container.setAttribute('aria-multiselectable',String(panel.multi));
      if(panel.kind==='table') {
        const header=make('div','is-table-row'); header.setAttribute('role','row');
        ['Name',...panel.columns.map(c=>c.label)].forEach(label=>{
          const cell=make('span','',label); cell.setAttribute('role','columnheader'); header.append(cell);
        });
        container.append(header);
      }
      const appendRows=(items,parent,depth=0)=>{
        items.forEach(row=>{
          const wrapper=make('div','is-result-item');
          wrapper.setAttribute('role',panel.kind==='tree'?'treeitem':panel.kind==='table'?'row':'listitem');
          wrapper.dataset.nodeId=row.id;
          const selected=view.selected.includes(row.id);
          if(panel.kind==='tree') {
            wrapper.setAttribute('aria-selected',String(selected));
            wrapper.setAttribute('aria-level',String(depth+1));
            if(row.children.length) wrapper.setAttribute('aria-expanded',String(view.expanded.includes(row.id)||!!view.query));
          }
          const line=make('div',panel.kind==='table'?'is-table-row':'is-result-line');
          line.style.paddingLeft=(depth*12)+'px';
          if(row.children.length && panel.kind==='tree') {
            const expand=make('button','is-expand',view.expanded.includes(row.id)?'▾':'▸');
            expand.setAttribute('aria-label',(view.expanded.includes(row.id)?'Collapse ':'Expand ')+row.label);
            expand.dataset.controlKey=panel.id+'/expand/'+row.id;
            expand.addEventListener('click',()=>this.updatePanelView(panel.id,{expanded:toggle(view.expanded,row.id)},expand.dataset.controlKey));
            line.append(expand);
          }
          const select=make(panel.multi?'label':'button','is-result-label');
          if(panel.multi) {
            const checkbox=make('input'); checkbox.type='checkbox'; checkbox.checked=selected;
            checkbox.dataset.controlKey=panel.id+'/row/'+row.id;
            checkbox.addEventListener('change',()=>this.updatePanelView(panel.id,{selected:toggle(view.selected,row.id)},checkbox.dataset.controlKey));
            select.append(checkbox,document.createTextNode(row.label));
          } else {
            select.textContent=row.label; select.setAttribute('aria-pressed',String(selected));
            select.dataset.controlKey=panel.id+'/row/'+row.id;
            select.addEventListener('click',()=>this.updatePanelView(panel.id,{selected:[row.id]},select.dataset.controlKey));
          }
          if(row.target && this.scene.frames[this.frameIndex].navigate?.[panel.id+'/'+row.id]) {
            const navigate=()=>this.navigatePanel(panel.id+'/'+row.id);
            select.addEventListener('dblclick',navigate);
            select.addEventListener('keydown',event=>{
              if(event.key==='Enter') {event.preventDefault(); navigate();}
            });
            select.title='Double-click or press Enter to navigate';
          }
          if(row.icon) { const icon=make('span','is-row-icon',row.icon); icon.setAttribute('aria-hidden','true'); select.prepend(icon); }
          line.append(select);
          if(panel.kind==='table') panel.columns.forEach(column=>{
            const cell=make('span','is-table-cell',row.values?.[column.id]||''); cell.setAttribute('role','cell'); line.append(cell);
          });
          wrapper.append(line); parent.append(wrapper);
          if(row.children.length && (panel.kind!=='tree'||view.expanded.includes(row.id)||view.query)) {
            const group=make('div'); if(panel.kind==='tree') group.setAttribute('role','group');
            wrapper.append(group); appendRows(row.children,group,depth+1);
          }
        });
      };
      appendRows(rows,container);
      container.addEventListener('keydown',event=>{
        if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
        const controls=[...container.querySelectorAll('[data-control-key]')].filter(el=>el.dataset.controlKey.includes('/row/'));
        const index=controls.indexOf(document.activeElement);
        if(index<0) return;
        event.preventDefault();
        const next=event.key==='Home'?0:event.key==='End'?controls.length-1:Math.max(0,Math.min(controls.length-1,index+(event.key==='ArrowDown'?1:-1)));
        controls[next]?.focus();
      });
      article.append(container);
      if(!rows.length) article.append(make('p','is-empty','No results'));
      const status=make('p','is-panel-status',[panel.status,panel.source,panel.message].filter(Boolean).join(' · '));
      status.setAttribute('role','status'); article.append(status);
      return article;
    }
    makeCopyButton(source) {
      const button=make('button','is-copy-file');
      button.type='button';button.setAttribute('aria-label','Copy current file');button.title='Copy current file';
      const icon=make('span','','⧉');icon.setAttribute('aria-hidden','true');button.append(icon);
      button.addEventListener('click',async()=>{
        const text=source();if(text===undefined)return;
        clearTimeout(this.copyTimer);this.copyHost.replaceChildren();
        try {
          if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
          await navigator.clipboard.writeText(text);
          this.copyHost.append(make('p','is-copy-status','Copied'));
          this.copyTimer=setTimeout(()=>this.copyHost.replaceChildren(),1800);
        } catch {
          this.copyHost.append(make('p','is-copy-status','Clipboard unavailable. Select and copy the source below.'));
          const area=make('textarea','is-copy-source');area.readOnly=true;area.value=text;
          area.setAttribute('aria-label','Source to copy');this.copyHost.append(area);area.focus();area.select();
        }
      });return button;
    }
    resolveAnchor(spec) {
      if(!spec)return null;
      const all=selector=>[...this.root.querySelectorAll(selector)];
      const candidates={
        caret:()=>this.activeEditor().querySelector('.is-caret')||this.activeEditor().querySelector('.is-selection')||this.activeEditor().querySelector('.is-code-content'),
        tab:()=>{const tabs=all('[role=tab][data-file-id]').filter(el=>el.dataset.fileId===spec.file&&el.getClientRects().length);return tabs.find(el=>el.closest('[data-group-active=true]'))||tabs[0];},
        project:()=>this.q('.is-project-toggle'),titlebar:()=>this.q('.is-titlebar'),menu:()=>this.q('.is-menu-title'),
        toolbar:()=>all('[data-panel-toolbar]').find(el=>el.dataset.panelToolbar===spec.id),
        gutter:()=>all('[data-marker-id]').find(el=>el.dataset.markerId===spec.id),
        node:()=>all('[data-node-id]').find(el=>el.dataset.nodeId===spec.id&&el.closest('[data-panel-id]')?.dataset.panelId===spec.panel),
        menu_item:()=>all('[data-menu-item]').find(el=>el.dataset.menuItem===spec.id),
        control:()=>all('[data-control-key]').find(el=>el.dataset.controlKey===spec.id),
      };
      if(spec.surface==='source') {
        const editor=this.activeEditor();
        if((editor.dataset.fileId||this.viewFile||this.state.active_file)!==spec.file)return null;
        const offset=spec.start;
        const span=[...editor.querySelectorAll('[data-offset]')].find(el=>offset>=Number(el.dataset.offset)&&offset<Number(el.dataset.offset)+Array.from(el.textContent).length);
        if(!span)return null;
        const index=Array.from(span.textContent).slice(0,offset-Number(span.dataset.offset)).join('').length;
        const range=document.createRange();range.setStart(span.firstChild,index);range.setEnd(span.firstChild,index+Array.from(span.textContent.slice(index))[0].length);
        return range.getBoundingClientRect();
      }
      const element=candidates[spec.surface]?.();
      return element?.getClientRects().length?element.getBoundingClientRect():null;
    }
    measurementClone() {
      const clone=this.root.cloneNode(true);
      clone.inert=true;clone.setAttribute('aria-hidden','true');
      Object.assign(clone.style,{position:'fixed',left:'-100000px',top:'0',width:this.root.getBoundingClientRect().width+'px',visibility:'hidden',pointerEvents:'none'});
      document.body.append(clone);
      const probe=Object.assign(Object.create(Object.getPrototypeOf(this)),this);
      probe.root=clone;probe.q=selector=>clone.querySelector(selector);probe.updatePointer=()=>{};
      probe.viewFile=null;probe.panelViews={};probe.groupViews={};probe.settingsQuery=null;probe.candidateView=null;
      for(const [property,selector] of Object.entries({modalHost:'.is-modal-host',candidateHost:'.is-candidates',documentHost:'.is-documentation',clipboardHost:'.is-clipboard',transactionHost:'.is-transaction',environmentHost:'.is-environment',settingsHost:'.is-settings',transcriptHost:'.is-transcript',groupsHost:'.is-editor-groups',mainCopyButton:'.is-file-controls .is-copy-file'}))probe[property]=probe.q(selector);
      return {clone,probe};
    }
    reserveSceneHeight() {
      // Measure every authored state, including alternate outcomes, outside the
      // visible layout. Reserve space before playback, never grow it per frame.
      const {clone,probe}=this.measurementClone();
      const selectors=['.is-window','.is-caption'];
      const maxima=selectors.map(()=>0);
      const seen=new Set();
      const states=[];
      let rootHeight=0;
      clone.style.minHeight='';
      try {
        selectors.forEach(selector=>probe.q(selector).style.minHeight='');
        const scene=this.data[this.index];
        for(const branch of [null,...Object.keys(scene.branches||{})]) {
          probe.branch=branch;
          for(const [index,frame] of probe.scene.frames.entries()) {
            probe.frameIndex=index;probe.time=frame.time;
            const {mouse,...layout}=frame.state;
            const key=JSON.stringify([layout,frame.accept,frame.transaction_actions]);
            if(seen.has(key))continue;
            seen.add(key);
            states.push({branch,index,frame});
            probe.render(frame.state);
            selectors.forEach((selector,i)=>maxima[i]=Math.max(maxima[i],probe.q(selector).getBoundingClientRect().height));
          }
        }
        selectors.forEach((selector,i)=>probe.q(selector).style.minHeight=Math.ceil(maxima[i])+'px');
        for(const {branch,index,frame} of states) {
          probe.branch=branch;probe.frameIndex=index;probe.time=frame.time;
          probe.render(frame.state);
          rootHeight=Math.max(rootHeight,clone.getBoundingClientRect().height);
        }
      } finally {clone.remove();}
      this.root.style.minHeight=Math.ceil(rootHeight)+'px';
      selectors.forEach((selector,i)=>this.q(selector).style.minHeight=Math.ceil(maxima[i])+'px');
      this.pointerHistory.clear();
      this.positionMenu();
    }
    historicalPointer(spec, cutoff) {
      // Measure a prior compiled frame in an inert clone. This also works on a
      // direct seek, without relying on which frames happened to play earlier.
      const key=JSON.stringify([this.index,this.branch,spec,cutoff,this.root.clientWidth]);
      if(this.pointerHistory.has(key))return this.pointerHistory.get(key);
      const {clone,probe}=this.measurementClone();
      let point=null;
      try {
        for(let i=this.scene.frames.length-1;i>=0;i--) {
          const frame=this.scene.frames[i];if(frame.time>cutoff)continue;
          probe.frameIndex=i;probe.render(frame.state);
          const target=probe.resolveAnchor(spec);if(!target)continue;
          const origin=probe.q('.is-window').getBoundingClientRect();
          point={x:target.left+Math.min(target.width/2,80)-origin.left,y:target.top+target.height/2-origin.top};break;
        }
      } finally {clone.remove();}
      this.pointerHistory.set(key,point);return point;
    }
    pointerPoint(spec, cutoff, historical=false) {
      const target=this.resolveAnchor(spec),origin=this.q('.is-window').getBoundingClientRect();
      if(target)return {x:target.left+Math.min(target.width/2,80)-origin.left,y:target.top+target.height/2-origin.top};
      return historical?this.historicalPointer(spec,cutoff):null;
    }
    updatePointer() {
      const mouse=this.state?.mouse,host=this.pointerHost;
      if(!host)return;
      const window=this.q('.is-window'),windowBox=window.getBoundingClientRect();
      if(!mouse||windowBox.width<24||windowBox.height<32){host.hidden=true;return;}
      const end=mouse.click_end??mouse.end;
      // A removed target remains at its last semantic position, remeasured for
      // the current width. Unknown targets still hide instead of guessing.
      const b=this.pointerPoint(mouse.target,Math.min(this.time,end),true);
      if(!b){host.hidden=true;return;}
      const a=this.pointerPoint(mouse.from,mouse.start,true)||b;
      const fraction=this.motion.matches?1:Math.max(0,Math.min(1,(this.time-mouse.start)/Math.max(1,mouse.end-mouse.start)));
      const eased=fraction*fraction*(3-2*fraction);
      const x=Math.max(4,Math.min(windowBox.width-24,a.x+(b.x-a.x)*eased-window.clientLeft-2));
      const y=Math.max(4,Math.min(windowBox.height-32,a.y+(b.y-a.y)*eased-window.clientTop-2));
      host.hidden=false;host.style.transform=`translate(${x}px,${y}px)`;
      const clicking=!this.motion.matches&&mouse.click_end!==null&&this.time>=mouse.end&&this.time<mouse.click_end;
      host.classList.toggle('is-mouse-click',clicking);
      host.style.setProperty('--is-click-progress',clicking?(this.time-mouse.end)/Math.max(1,mouse.click_end-mouse.end):0);
    }

    focusFileTab(name) {
      [...this.q('.is-file-tabs').children].find(tab => tab.dataset.fileId === name)?.focus();
    }
    positionMenu() {
      this.positionPopup(this.q('.is-popup'), this.state?.menu?.anchor || {surface:'caret'});
      this.positionPopup(this.candidateHost, (this.state?.completion || this.state?.chooser)?.anchor || {surface:'caret'});
      this.positionPopup(this.documentHost,this.state?.documentation?.anchor || {surface:'caret'});
      this.updatePointer();
    }
    positionPopup(popup, spec) {
      if (!popup || popup.hidden) return;
      const editor = spec.surface === 'caret' ? this.activeEditor() : this.q('.is-window');
      if (popup.parentElement !== editor) editor.append(popup);
      const origin = editor.getBoundingClientRect();
      const target = this.resolveAnchor(spec);
      if (!target) return;
      const gutter = 8;
      const width = popup.offsetWidth;
      const left = Math.max(gutter, Math.min(target.left - origin.left, editor.clientWidth - width - gutter));
      const top = target.bottom - origin.top + editor.scrollTop + 4;
      popup.style.left = `${left}px`;
      popup.style.top = `${top}px`;
      // Reserve space below an anchored menu, so it never covers tool panels.
      if (spec.surface === 'caret') editor.style.minHeight = `${Math.max(224, top + popup.offsetHeight + 16)}px`;
    }
    visibleGutters(state) {
      const gutters={...state.gutters};
      for(const run of this.scene.runs || []) {
        if(gutters[run.marker]) continue;
        const frame=this.scene.frames.find(f=>f.state.gutters?.[run.marker]);
        const marker=frame?.state.gutters[run.marker];
        if(!marker || !(marker.file in state.files)) continue;
        const original=Array.from(frame.state.files[marker.file]);
        const needle=original.slice(marker.start,marker.end).join('');
        const source=state.files[marker.file];
        const start=source.indexOf(needle);
        // Only retain an unambiguous source anchor after edits.
        if(!needle || start<0 || source.indexOf(needle,start+needle.length)>=0) continue;
        const offset=Array.from(source.slice(0,start)).length;
        gutters[marker.id]={...marker,start:offset,end:offset+Array.from(needle).length};
      }
      return Object.values(gutters);
    }
    renderCode(state, pre=this.q('.is-editor .is-code')) {
      const file = state.active_file;
      const spans = this.scene.token_streams[state.tokens[file]] || [];
      pre.replaceChildren();
      let offset = 0, tokenIndex = 0;
      if(!file) {pre.append(make('span','','No open file'));return;}
      const gutters = this.visibleGutters(state);
      const lines = state.files[file].split('\n');
      if (lines.length > 1 && lines.at(-1) === '') lines.pop();
      lines.forEach((text, index) => {
        Object.values(state.annotations||{}).filter(a=>a.file===file&&a.kind==='code_vision'&&a.start>=offset&&a.start<=offset+Array.from(text).length).forEach(a=>{
          const hint=make('button','is-code-vision',a.label||'Code vision');
          hint.disabled=!this.scene.frames[this.frameIndex].navigate?.['annotations/'+a.id];
          hint.addEventListener('click',()=>this.navigatePanel('annotations/'+a.id));pre.append(hint);
        });
        const line = make('span', 'is-code-line');
        const number = make('span', 'is-line-number', String(index + 1));
        number.setAttribute('aria-hidden', 'true');
        line.append(number);
        const markers = gutters.filter(g =>
          g.file === file && g.start >= offset && g.start <= offset + Array.from(text).length);
        const hasGutter = gutters.some(g => g.file === file);
        if (hasGutter) {
          const gutter = make('span', 'is-gutter');
          markers.forEach(marker => {
            const button = make('button', 'is-run-marker', '▶');
            button.setAttribute('aria-label', marker.label);
            button.title = marker.label;
            button.dataset.markerId = marker.id;
            button.disabled = !(this.scene.runs || []).some(run => run.marker === marker.id);
            button.addEventListener('click', () => this.runMarker(marker.id));
            gutter.append(button);
          });
          line.append(gutter);
        }
        const content = make('span', 'is-code-content');
        let run = '', prior = '', runStart = offset;
        const flush = () => {
          if (!run) return;
          const span = make('span', prior, run);
          span.dataset.offset = runStart;
          content.append(span);
          run = '';
        };
        for (const char of Array.from(text)) {
          while (tokenIndex + 1 < spans.length && spans[tokenIndex].end <= offset) tokenIndex++;
          let cls = `is-token-${spans[tokenIndex]?.kind || 'plain'}`;
          const inside = mark => mark && mark.file === file && offset >= mark.start && offset < mark.end;
          if (inside(state.selection)) cls += ' is-selection';
          if (inside(state.edit)) cls += ' is-edit';
          Object.values(state.annotations||{}).filter(a=>a.kind!=='code_vision'&&inside(a)).forEach(a=>{cls+=' is-annotation-'+(a.style||'related');});
          if(spans[tokenIndex]?.injected) cls+=' is-injected';
          state.diagnostics.filter(inside).forEach(d => { cls += ` is-squiggle-${d.severity}`; });
          if (state.caret?.file === file && state.caret.offset === offset) {
            flush();
            runStart = offset;
            content.append(make('span', 'is-caret'));
          }
          if (cls !== prior) { flush(); prior = cls; runStart = offset; }
          run += char;
          offset++;
        }
        flush();
        if (state.caret?.file === file && state.caret.offset === offset) content.append(make('span', 'is-caret'));
        if (!text) content.append(document.createTextNode('\u200b'));
        line.append(content);
        pre.append(line);
        offset++; // newline is one Unicode code point
      });
    }
    runMarker(id) {
      const runs = (this.scene.runs || []).filter(run => run.marker === id);
      const run = runs.find(run => run.end >= this.time) || runs.at(-1);
      if (!run) return;
      this.seek(run.start);
      this.play();
      const button = [...this.root.querySelectorAll('.is-run-marker')]
        .find(button => button.getAttribute('aria-label') === this.state.gutters[id]?.label);
      button?.focus({preventScroll: true});
    }
    navigatePanel(id) {
      const key=this.scene.frames[this.frameIndex].navigate?.[id];
      if(!key) return;
      this.pause(); this.branch=key; this.frameIndex=-1;
      this.q('input[type=range]').max=this.scene.duration;
      this.seek(this.scene.duration);
      this.q('.is-editor').focus({preventScroll:true});
    }
    acceptCandidate(id) {
      const key=this.scene.frames[this.frameIndex].accept?.[id];
      if(!key) return;
      this.pause(); this.branch=key; this.frameIndex=-1;
      this.q('input[type=range]').max=this.scene.duration;
      this.seek(this.scene.duration);
      this.q('.is-editor').focus({preventScroll:true});
    }
    renderCandidates(component) {
      const popup=this.candidateHost;
      popup.replaceChildren(); popup.hidden=!component;
      if(!component) return;
      const view=this.candidateView || {query:component.query,tab:component.tab,selected:component.selected};
      const heading=make('div','is-popup-title',component.title);
      const close=make('button','is-popup-close','×'); close.setAttribute('aria-label','Dismiss suggestions');
      close.addEventListener('click',()=>this.dismiss()); heading.append(close); popup.append(heading);
      const rerender=(change,focusSearch=true,selection=null)=>{
        this.pause(); this.candidateView={...view,...change};
        this.renderCandidates(component);
        this.positionMenu();
        if(focusSearch) {
          const input=this.candidateHost.querySelector('input');
          input?.focus({preventScroll:true});
          if(input && selection) input.setSelectionRange(...selection);
        }
      };
      if(component.tabs.length) {
        const tabs=make('div','is-candidate-tabs'); tabs.setAttribute('role','tablist');
        tabs.setAttribute('aria-label',component.title+' categories');
        component.tabs.forEach(tab=>{
          const button=make('button','',tab.label); button.setAttribute('role','tab');
          button.setAttribute('aria-selected',String(tab.id===view.tab));
          const activate=target=>rerender({tab:target.id,selected:null});
          button.tabIndex=view.tab===tab.id?0:-1;
          button.addEventListener('click',()=>activate(tab));
          button.addEventListener('keydown',event=>{
            const i=component.tabs.indexOf(tab), n=component.tabs.length;
            const keys={ArrowRight:(i+1)%n,ArrowLeft:(i+n-1)%n,Home:0,End:n-1};
            if(event.key in keys) {event.preventDefault(); activate(component.tabs[keys[event.key]]);}
          });
          tabs.append(button);
        }); popup.append(tabs);
      }
      const search=make('input','is-candidate-search');
      search.type='search'; search.setAttribute('aria-label','Search '+component.title);
      search.value=view.query;
      search.placeholder=this.state.completion ? 'Filter suggestions · prefix: '+component.prefix : 'Type to search';
      search.addEventListener('input',()=>rerender({query:search.value,selected:null},true,[search.selectionStart,search.selectionEnd,search.selectionDirection]));
      popup.append(search);
      const list=make('div','is-candidate-list'); list.setAttribute('role','listbox');
      list.setAttribute('aria-label',component.title); list.id='candidate-options';
      search.setAttribute('aria-controls',list.id);
      const visible=[];
      const filter=items=>items.flatMap(item=>{
        if(item.tab && item.tab!==view.tab) return [];
        const children=item.children?filter(item.children):[];
        if(!item.label.toLocaleLowerCase().includes(view.query.toLocaleLowerCase()) && !children.length) return [];
        return [{...item,children}];
      });
      const draw=(items,parent,depth=0)=>items.forEach(item=>{
        if(item.children.length) {
          const group=make('div','is-candidate-group'); group.setAttribute('role','group');
          group.setAttribute('aria-label',item.label);
          group.append(make('div','is-candidate-group-label',item.label)); parent.append(group);
          draw(item.children,group,depth+1); return;
        }
        // An empty group after filtering must never become an actionable leaf.
        if(!this.scene.frames[this.frameIndex].accept?.[item.id] && item.enabled!==false) return;
        const option=make('button','is-candidate');
        option.setAttribute('role','option'); option.disabled=item.enabled===false;
        option.id='candidate-'+item.id; option.style.paddingLeft=(12+depth*12)+'px';
        const label=make('span','is-candidate-label',item.label);
        if(item.icon) { const icon=make('span','is-row-icon',item.icon); icon.setAttribute('aria-hidden','true'); label.prepend(icon); }
        option.append(label,make('span','is-candidate-detail',[item.detail,item.type,item.origin].filter(Boolean).join(' · ')));
        option.setAttribute('aria-selected',String(view.selected===item.id));
        option.addEventListener('click',()=>this.acceptCandidate(item.id));
        parent.append(option);
        if(!option.disabled) visible.push(item.id);
      });
      draw(filter(component.items),list);
      const selected=visible.includes(view.selected)?view.selected:visible[0];
      [...list.querySelectorAll('[role=option]')].forEach(el=>el.setAttribute('aria-selected',String(el.id==='candidate-'+selected)));
      if(selected) search.setAttribute('aria-activedescendant','candidate-'+selected);
      if(!visible.length) list.append(make('p','is-empty','No matching results'));
      popup.append(list);
      popup.onkeydown=event=>{
        if(event.key==='Escape') { event.preventDefault(); this.dismiss(); return; }
        if(event.key==='Enter' && event.target===search && selected) { event.preventDefault(); this.acceptCandidate(selected); return; }
        if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key)||!visible.length) return;
        event.preventDefault();
        const index=visible.indexOf(selected);
        const next=event.key==='Home'?0:event.key==='End'?visible.length-1:
          (index+(event.key==='ArrowDown'?1:-1)+visible.length)%visible.length;
        rerender({selected:visible[next]});
        this.candidateHost.querySelector('#candidate-'+visible[next])?.scrollIntoView({block:'nearest'});
      };
    }
    copyDocument(id) {
      const key=this.scene.frames[this.frameIndex].copy?.[id];
      if(!key) return;
      this.pause(); this.branch=key; this.frameIndex=-1;
      this.q('input[type=range]').max=this.scene.duration;
      this.seek(this.scene.duration);
      this.documentHost.querySelector('.is-popup-close')?.focus({preventScroll:true});
    }
    renderClipboard(clipboard, notification) {
      const host=this.clipboardHost; host.replaceChildren(); host.hidden=!clipboard;
      if(!clipboard) return;
      host.setAttribute('aria-label','Simulated clipboard');
      host.append(make('h2','','Simulated clipboard'),make('p','',clipboard.provenance),make('pre','',clipboard.text));
      const status=make('p','',notification); status.setAttribute('role','status'); host.append(status);
    }
    renderDocument(doc) {
      const host=this.documentHost; host.replaceChildren(); host.hidden=!doc;
      if(!doc) return;
      host.setAttribute('role','dialog'); host.setAttribute('aria-modal','false'); host.setAttribute('aria-label',doc.title);
      const heading=make('div','is-popup-title'); heading.append(make('h2','',doc.title));
      const close=make('button','is-popup-close','×'); close.setAttribute('aria-label','Dismiss documentation');
      close.addEventListener('click',()=>this.dismiss()); heading.append(close); host.append(heading);
      if(doc.attribution) host.append(make('p','is-document-attribution',doc.attribution));
      const body=make('div','is-document-body');
      doc.blocks.forEach(block=>{
        if(block.kind==='paragraph') body.append(make('p','',block.text));
        if(block.kind==='signature') body.append(make('pre','is-document-signature',block.text));
        if(block.kind==='code') {
          const pre=make('pre','is-document-code');
          const chars=Array.from(block.text); let offset=0;
          (block.tokens||[]).forEach(span=>{
            if(span.start>offset) pre.append(document.createTextNode(chars.slice(offset,span.start).join('')));
            pre.append(make('span','is-token-'+span.kind,chars.slice(span.start,span.end).join(''))); offset=span.end;
          });
          if(offset<chars.length) pre.append(document.createTextNode(chars.slice(offset).join('')));
          body.append(pre);
          if(block.copy!=='none') {
            const copy=make('button','is-document-copy','Copy '+block.id);
            copy.dataset.controlKey='documentation/'+doc.id+'/copy/'+block.id;
            copy.addEventListener('click',()=>this.copyDocument(block.id)); body.append(copy);
          }
        }
        if(block.kind==='list') {const list=make('ul');block.items.forEach(item=>list.append(make('li','',item)));body.append(list);}
        if(block.kind==='table') {
          const scroll=make('div','is-document-table');scroll.tabIndex=0;scroll.setAttribute('aria-label','Documentation table');
          const table=make('table'),head=make('thead'),row=make('tr');
          block.columns.forEach(c=>{const th=make('th','',c);th.scope='col';row.append(th);});head.append(row);table.append(head);
          const tbody=make('tbody');block.rows.forEach(r=>{const tr=make('tr');r.forEach(c=>tr.append(make('td','',c)));tbody.append(tr);});table.append(tbody);scroll.append(table);body.append(scroll);
        }
        if(block.kind==='link') {const link=make('a','',block.label);link.href=block.url;link.target='_blank';link.rel='noopener noreferrer';body.append(link);}
      });
      host.append(body);
      host.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();this.dismiss();}};
    }
    transactionAction(action) {
      const key=this.scene.frames[this.frameIndex].transaction_actions?.[action];
      if(!key) return;
      this.pause();this.branch=key;this.frameIndex=-1;
      this.q('input[type=range]').max=this.scene.duration;
      this.seek(this.scene.duration);
      this.q('[data-action=play]').focus({preventScroll:true});
    }
    renderTransaction(state) {
      const host=this.transactionHost;host.replaceChildren();
      const tx=state.transaction,actions=this.scene.frames[this.frameIndex].transaction_actions||{};
      host.hidden=!tx&&!actions.undo&&!actions.redo;
      if(host.hidden) return;
      host.setAttribute('role','region');host.setAttribute('aria-label',tx?.title||'Source history');
      if(tx) {
        host.append(make('h2','',tx.title),make('p','','Preview · source is unchanged until commit'));
        Object.keys(tx.changes).forEach(id=>{
          const section=make('section','is-file-diff');
          const before=tx.before.files[id],after=tx.after.files[id];
          const oldPath=tx.before.file_paths[id],newPath=tx.after.file_paths[id];
          section.append(make('h3','',(oldPath&&newPath&&oldPath!==newPath)?oldPath+' → '+newPath:(newPath||oldPath)));
          const columns=make('div','is-diff-columns');
          [['Before',before],['After',after]].forEach(([label,content])=>{
            const side=make('div');side.append(make('h4','',label),make('pre','',content===undefined?'(File absent)':content));columns.append(side);
          });section.append(columns);host.append(section);
        });
        if(tx.conflicts.length) {
          const conflicts=make('ul','is-conflicts');
          tx.conflicts.forEach(c=>conflicts.append(make('li','is-conflict-'+c.status,c.status+' · '+c.file+' · '+c.message)));host.append(conflicts);
        }
      }
      const controls=make('div','is-transaction-actions');
      [['commit','Commit'],['cancel','Cancel'],['undo','Undo source change'],['redo','Redo source change']].forEach(([id,label])=>{
        if(!actions[id]) return;
        const button=make('button','',label);button.dataset.controlKey='transaction/'+id;button.addEventListener('click',()=>this.transactionAction(id));controls.append(button);
      });host.append(controls);
      host.onkeydown=event=>{if(event.key==='Escape'&&actions.cancel){event.preventDefault();this.transactionAction('cancel');}};
    }
    renderSpecialized(state) {
      const env=this.environmentHost;env.replaceChildren();env.hidden=!Object.keys(state.environment||{}).length;
      Object.entries(state.environment||{}).forEach(([key,value])=>env.append(make('span','',key+': '+value)));
      this.renderSettings(state.settings);
      const host=this.transcriptHost;host.replaceChildren();host.hidden=!state.transcript;
      if(state.transcript) {
        const t=state.transcript;host.setAttribute('role','region');host.setAttribute('aria-label',t.title);
        host.append(make('h2','',t.title),make('p','',t.provenance));
        t.entries.forEach(entry=>{
          const row=make('article','is-transcript-entry is-transcript-'+entry.status);
          row.append(make('h3','',entry.actor+' · '+entry.method+' · '+entry.status));
          ['arguments','result','error'].forEach(key=>{if(entry[key]!==undefined) row.append(make('pre','',typeof entry[key]==='string'?entry[key]:JSON.stringify(entry[key],null,2)));});
          if(entry.segment) {const button=make('button','','Show '+entry.segment);button.addEventListener('click',()=>this.playSegment(entry.segment));row.append(button);}
          host.append(row);
        });
      }
    }
    renderSettings(settings) {
      const host=this.settingsHost;host.replaceChildren();host.hidden=!settings;
      if(!settings) return;
      host.setAttribute('role','region');host.setAttribute('aria-label',settings.title);
      host.append(make('h2','',settings.title));
      const search=make('input');search.type='search';search.placeholder='Search settings';search.setAttribute('aria-label','Search settings');search.value=this.settingsQuery??settings.query??'';
      search.addEventListener('input',()=>{this.pause();this.settingsQuery=search.value;this.renderSettings(settings);this.settingsHost.querySelector('input').focus();});host.append(search);
      const query=search.value.toLocaleLowerCase();
      settings.groups.forEach(group=>{
        const controls=group.controls.filter(c=>(group.label+' '+c.label).toLocaleLowerCase().includes(query));
        if(!controls.length) return;
        const section=make('details');section.open=true;section.append(make('summary','',group.label));
        controls.forEach(control=>{
          const row=make('div','is-setting');
          const button=make('button','',control.label+(control.options?' · '+control.value:''));
          button.dataset.controlKey='settings/'+settings.id+'/'+control.id;
          button.setAttribute('aria-label',control.label);
          if(!control.options) {button.setAttribute('role','checkbox');button.setAttribute('aria-checked',String(control.value));}
          button.disabled=!control.enabled;button.title=control.reason||'Authored setting';
          if(control.outcome) button.addEventListener('click',()=>this.choose(control.outcome));
          else button.setAttribute('aria-readonly','true');
          row.append(button);if(control.reason) row.append(make('p','',control.reason));section.append(row);
        });host.append(section);
      });
    }
    activeEditor() {
      return this.groupsHost.querySelector('[data-group-active=true] .is-group-editor')||this.q('.is-editor');
    }
    renderGroups(state) {
      const host=this.groupsHost;host.replaceChildren();host.hidden=!state.editor_groups&&!state.diff_view;
      const grouped=!!state.editor_groups||!!state.diff_view;
      this.q('.is-file-controls').hidden=grouped;this.q('.is-editor').hidden=grouped;
      if(!grouped) return;
      if(state.diff_view) {
        const diff=state.diff_view,section=make('section','is-group-diff');section.setAttribute('aria-label','Full-width diff');
        section.append(make('h2','',diff.file));const columns=make('div','is-diff-columns');
        [['Before',diff.before],['After',diff.after]].forEach(([label,source])=>{const side=make('div');side.append(make('h3','',label),make('pre','',source===null?'(File absent)':source));columns.append(side);});section.append(columns);host.append(section);return;
      }
      state.editor_groups.groups.forEach(group=>{
        const available=group.tabs.filter(t=>t.file in state.files);
        const selected=this.groupViews[group.id]?.file||group.active;
        const current=available.find(t=>t.file===selected)||available[0];
        const pane=make('section','is-editor-group');pane.dataset.groupId=group.id;
        pane.dataset.groupActive=String(state.editor_groups.active===group.id);
        pane.setAttribute('aria-label',group.title);pane.setAttribute('role','region');
        pane.append(make('h2','',group.title));
        const tabs=make('div','is-group-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',group.title+' files');
        available.forEach((tab,index)=>{
          const button=make('button','',state.file_paths?.[tab.file]||tab.file);button.dataset.fileId=tab.file;button.setAttribute('role','tab');button.setAttribute('aria-label',state.file_paths?.[tab.file]||tab.file);button.setAttribute('aria-selected',String(tab===current));button.tabIndex=tab===current?0:-1;
          if(tab.pinned) {button.dataset.pinned='true';button.title='Pinned';}
          const browse=()=>{this.pause();this.groupViews[group.id]={...this.groupViews[group.id],file:tab.file};this.renderGroups(state);[...this.groupsHost.querySelectorAll('[data-group-id]')].find(p=>p.dataset.groupId===group.id)?.querySelector('[aria-selected=true]')?.focus();};
          button.addEventListener('click',browse);
          button.addEventListener('keydown',event=>{
            const target={ArrowRight:(index+1)%available.length,ArrowLeft:(index+available.length-1)%available.length,Home:0,End:available.length-1}[event.key];
            if(target===undefined)return;event.preventDefault();this.groupViews[group.id]={...this.groupViews[group.id],file:available[target].file};this.pause();this.renderGroups(state);[...this.groupsHost.querySelectorAll('[data-group-id]')].find(p=>p.dataset.groupId===group.id)?.querySelector('[aria-selected=true]')?.focus();
          });tabs.append(button);
        });const controls=make('div','is-group-file-controls');controls.append(tabs);
        if(current) controls.append(this.makeCopyButton(()=>state.files[current.file]));pane.append(controls);
        const editor=make('div','is-group-editor');editor.tabIndex=0;
        editor.dataset.fileId=current?.file||'';
        editor.setAttribute('aria-label',group.title+' editor');const pre=make('pre','is-code');editor.append(pre);
        if(current) this.renderCode({...state,active_file:current.file,selection:current.selection,caret:current.caret},pre);
        else pre.append(document.createTextNode('No available files'));
        pane.append(editor);host.append(pane);
        editor.scrollTop=this.groupViews[group.id]?.scroll?.[current?.file]??current?.scroll??0;
        editor.addEventListener('scroll',()=>{const view=this.groupViews[group.id]||{};this.groupViews[group.id]={...view,scroll:{...view.scroll,[current?.file]:editor.scrollTop}};this.positionMenu();});
      });
    }
    renderModal(modal) {
      const host = this.modalHost;
      const hadFocus = host.contains(document.activeElement);
      host.replaceChildren();
      host.hidden = !modal;
      if (!modal) {
        if (hadFocus) this.q('[data-action=play]').focus({preventScroll: true});
        return;
      }
      const dialog = make('section', 'is-modal');
      dialog.setAttribute('role', 'dialog');
      // This is a timeline illustration; playback controls remain available.
      dialog.setAttribute('aria-modal', 'false');
      dialog.setAttribute('aria-label', modal.title);
      dialog.append(make('h2', '', modal.title),
        make('p', 'is-modal-note', 'Scripted preview · fields follow the demonstration'));
      const fields = make('div', 'is-modal-fields');
      modal.fields.filter(field=>field.visible!==false).forEach(field => {
        const label = make('label', 'is-modal-field');
        label.dataset.controlKey=modal.id+'/field/'+field.id;
        label.append(make('span', '', field.label));
        if(field.enabled===false) label.classList.add('is-field-disabled');
        if(field.error) label.append(make('span','is-field-error',field.error));
        if(field.type==='table') {
          const table=make('table','is-field-table'),head=make('tr');field.columns.forEach(c=>head.append(make('th','',c)));table.append(head);
          field.value.forEach(row=>{const tr=make('tr');row.forEach(c=>tr.append(make('td','',c)));table.append(tr);});label.append(table);fields.append(label);return;
        }
        if(field.type==='radio') {
          const group=make('fieldset','is-field-radio');group.dataset.controlKey=modal.id+'/field/'+field.id;group.append(make('legend','',field.label));
          field.options.forEach(option=>{const row=make('label'),input=make('input');input.type='radio';input.checked=field.value===option;input.disabled=true;row.append(input,document.createTextNode(option));group.append(row);});fields.append(group);return;
        }
        if (field.type === 'checklist') {
          const group = make('div', 'is-modal-checklist');
          field.options.forEach(option => {
            const row = make('label');
            const input = make('input');
            input.type = 'checkbox'; input.checked = field.value.includes(option); input.disabled = true;
            row.append(input, document.createTextNode(option)); group.append(row);
          });
          // Do not nest label elements.
          const container = make('div', 'is-modal-field');container.dataset.controlKey=modal.id+'/field/'+field.id;
          container.append(make('span', '', field.label), group); fields.append(container);
          return;
        }
        const input = make(field.type === 'select' ? 'select' : ['multiline','code'].includes(field.type)?'textarea':'input');
        if (field.type === 'select') {
          field.options.forEach(option => {
            const item = make('option', '', option); item.value = option; input.append(item);
          });
          input.value = field.value; input.disabled = true;
        } else if (field.type === 'checkbox') {
          input.type = 'checkbox'; input.checked = field.value; input.disabled = true;
        } else { if(input.tagName==='INPUT') input.type = 'text'; input.value = field.value; input.readOnly = true; }
        if(field.enabled===false) input.disabled=true;
        if(field.error) input.setAttribute('aria-invalid','true');
        label.append(input); fields.append(label);
      });
      dialog.append(fields);
      const actions = make('div', 'is-modal-actions');
      modal.buttons.forEach(item => {
        const button = make('button', modal.activated === item.id ? 'is-activated' : '', item.label);
        button.dataset.controlKey=modal.id+'/button/'+item.id;
        button.disabled=item.enabled===false;
        if(item.reason) button.title=item.reason;
        button.addEventListener('click', () => {
          if (this.choose(item.id)) {
            this.q('[data-action=play]').focus({preventScroll: true});
            return;
          }
          const next = this.scene.frames.find(frame => frame.time >= this.time &&
            frame.state.modal?.id === modal.id && frame.state.modal.activated === item.id);
          if (next) { this.seek(next.time); this.play(); }
          else { this.dismiss(); }
          this.q('[data-action=play]').focus({preventScroll: true});
        });
        actions.append(button);
      });
      dialog.append(actions);
      dialog.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          if (!this.choose('cancel')) this.dismiss();
          this.q('[data-action=play]').focus({preventScroll: true});
        }
      });
      host.append(dialog);
    }
    renderMenu(menu) {
      const popup = this.q('.is-popup');
      popup.hidden = !menu;
      popup.replaceChildren();
      this.q('.is-menu-title').textContent = menu?.kind === 'menu' ? menu.title : 'Code';
      this.q('.is-editor').style.minHeight = '';
      if (!menu) return;
      popup.dataset.kind = menu.kind;
      popup.setAttribute('aria-label', `${menu.title} illustration`);
      const heading = make('div', 'is-popup-title', menu.title);
      const close = make('button', 'is-popup-close', '×');
      close.setAttribute('aria-label', 'Dismiss menu');
      close.addEventListener('click', () => this.dismiss());
      heading.append(close);
      popup.append(heading);
      popup.onkeydown = event => {
        if (event.key === 'Escape') { event.preventDefault(); this.dismiss(); }
      };
      let items = menu.items;
      for (let depth = 0; items; depth++) {
        const list = make('ul', 'is-menu-level');
        items.forEach(item => {
          const row = make('li', menu.path.includes(item.id) ? 'is-menu-selected' : '');
          row.dataset.menuItem=item.id;
          row.append(make('span', '', item.label), make('span', 'is-shortcut', item.items ? '›' : (item.shortcut || '')));
          list.append(row);
        });
        popup.append(list);
        items = items.find(item => item.id === menu.path[depth])?.items;
      }
      this.positionMenu();
    }
  }
  document.querySelectorAll('[data-ide-scenes]').forEach(root => {
    if(root.player)return;
    try { new Player(root); }
    catch (error) {
      root.querySelector('.is-player').hidden = true;
      root.querySelector('.is-fallback').hidden = false;
      root.querySelector('.is-fallback').open = true;
      root.prepend(make('p', 'is-error', 'Playback could not load. Read the before and after examples below.'));
      console.error(error);
    }
  });
})();
