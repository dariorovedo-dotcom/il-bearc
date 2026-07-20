/* ============================================================
   Il Bearč — i18n leggero (IT / EN / DE)
   - Italiano nell'HTML: nessun caricamento extra per chi non cambia lingua
   - Dizionari en.json / de.json caricati SOLO alla prima selezione (lazy)
   - Preferenza salvata in localStorage ('bearc-lang'): dato tecnico-
     funzionale richiesto dall'utente, nessun impatto privacy/GDPR
   - Nessuna dipendenza, nessun servizio esterno
   ============================================================ */
(function(){
  'use strict';

  var STORAGE_KEY = 'bearc-lang';
  var LANGS = ['it','en','de'];
  var DICT_PATH = 'i18n/';        // en.json, de.json accanto a questo file

  var cacheIt = null;             // snapshot dell'italiano originale
  var dicts = {};                 // dizionari già scaricati

  function nodes(){ return document.querySelectorAll('[data-i18n]'); }

  function snapshotItalian(){
    if (cacheIt) return;
    cacheIt = { __title: document.title, __metadesc: metaDesc() };
    nodes().forEach(function(el){ cacheIt[el.getAttribute('data-i18n')] = el.innerHTML; });
  }

  function metaDesc(){
    var m = document.querySelector('meta[name="description"]');
    return m ? m.getAttribute('content') : '';
  }
  function setMetaDesc(v){
    var m = document.querySelector('meta[name="description"]');
    if (m && v) m.setAttribute('content', v);
  }

  var calIt = null;   // snapshot dei testi italiani del calendario

  function applyCalendar(dict){
    if (!window.BEARC_CAL) return;
    if (!calIt) calIt = JSON.parse(JSON.stringify(window.BEARC_CAL));
    if (dict){
      if (dict['cal.months'])       window.BEARC_CAL.months = dict['cal.months'].split(',');
      if (dict['cal.days'])         window.BEARC_CAL.days = dict['cal.days'].split(',');
      if (dict['cal.alertOrder'])   window.BEARC_CAL.alertOrder = dict['cal.alertOrder'];
      if (dict['cal.alertMinStay']) window.BEARC_CAL.alertMinStay = dict['cal.alertMinStay'];
      if (dict['cal.nightSing'])    window.BEARC_CAL.nightSing = dict['cal.nightSing'];
      if (dict['cal.nightPlur'])    window.BEARC_CAL.nightPlur = dict['cal.nightPlur'];
      if (dict['cal.avaibook'])     window.BEARC_CAL.avaibookLang = dict['cal.avaibook'];
    } else {
      window.BEARC_CAL = JSON.parse(JSON.stringify(calIt));
    }
    if (typeof window.renderCal === 'function'){
      try { window.renderCal(); } catch(e){}
    }
  }

  function applyDict(dict, lang){
    applyCalendar(dict);
    nodes().forEach(function(el){
      var k = el.getAttribute('data-i18n');
      if (dict[k] !== undefined) el.innerHTML = dict[k];
    });
    if (dict['head.title1']) document.title = dict['head.title1'].replace(/<[^>]+>/g,'');
    setMetaDesc(dict['head.metadesc']);
    document.documentElement.setAttribute('lang', lang);
    markActive(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch(e){}
  }

  function restoreItalian(){
    applyCalendar(null);
    if (!cacheIt) { markActive('it'); try{localStorage.setItem(STORAGE_KEY,'it');}catch(e){} return; }
    nodes().forEach(function(el){
      var k = el.getAttribute('data-i18n');
      if (cacheIt[k] !== undefined) el.innerHTML = cacheIt[k];
    });
    document.title = cacheIt.__title;
    setMetaDesc(cacheIt.__metadesc);
    document.documentElement.setAttribute('lang', 'it');
    markActive('it');
    try { localStorage.setItem(STORAGE_KEY, 'it'); } catch(e){}
  }

  function markActive(lang){
    document.querySelectorAll('.lang-btn').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
  }

  function setLang(lang){
    if (LANGS.indexOf(lang) === -1) return;
    snapshotItalian();                      // salva l'originale prima del primo cambio
    if (lang === 'it') { restoreItalian(); return; }
    if (dicts[lang]) { applyDict(dicts[lang], lang); return; }
    fetch(DICT_PATH + lang + '.json')
      .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(d){ dicts[lang] = d; applyDict(d, lang); })
      .catch(function(err){
        console.warn('i18n: dizionario "'+lang+'" non disponibile', err);
        markActive(document.documentElement.getAttribute('lang') || 'it');
      });
  }

  // API pubblica minima (usata dal selettore)
  window.bearcSetLang = setLang;

  // I blocchi tradotti vengono ricreati via innerHTML: i listener che il
  // sito aggancia ai singoli link al caricamento (scroll fluido, chiusura
  // menu mobile) andrebbero persi. Questa delega a livello di documento
  // interviene SOLO quando il listener originale manca (defaultPrevented
  // resta false), quindi nessuna doppia gestione sui link non toccati.
  document.addEventListener('click', function(e){
    if (e.defaultPrevented) return;                    // già gestito dal sito
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.length < 2) return;
    var target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    // prima la chiusura del menu (essenziale su mobile), poi lo scroll
    var nl = document.getElementById('nav-links');
    var hb = document.getElementById('nav-hamburger');
    if (nl) nl.classList.remove('open');
    if (hb) hb.classList.remove('open');
    if (typeof target.scrollIntoView === 'function'){
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Ripristino preferenza al caricamento
  document.addEventListener('DOMContentLoaded', function(){
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch(e){}
    if (saved && saved !== 'it') setLang(saved); else markActive('it');
  });
})();
