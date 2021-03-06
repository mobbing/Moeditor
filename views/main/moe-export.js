/*
*  This file is part of Moeditor.
*
*  Copyright (c) 2016 Menci <huanghaorui301@gmail.com>
*
*  Moeditor is free software: you can redistribute it and/or modify
*  it under the terms of the GNU General Public License as published by
*  the Free Software Foundation, either version 3 of the License, or
*  (at your option) any later version.
*
*  Moeditor is distributed in the hope that it will be useful,
*  but WITHOUT ANY WARRANTY; without even the implied warranty of
*  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*  GNU General Public License for more details.
*
*  You should have received a copy of the GNU General Public License
*  along with Moeditor. If not, see <http://www.gnu.org/licenses/>.
*/

'use strict'

const MoeditorFile = require('../../app/moe-file');
const path = require('path');

function render(s, type, cb) {
    const MoeditorHighlight = require('./moe-highlight');
    const MoeditorMathRenderer = require('./moe-math');
    const MoeMark = require('moemark');
    const jQuery = require('jquery');

    var math = new Array(), rendering = true, mathCnt = 0, mathID = 0, rendered = null, haveMath = false, haveCode = false;

    MoeMark.setOptions({
        math: moeApp.config.get('math'),
        umlchart: moeApp.config.get('uml-diagrams'),
        breaks: moeApp.config.get('breaks'),
        highlight: (code, lang) => {
            haveCode = true;
            return MoeditorHighlight(code, lang);
        }
    });

    function finish() {
        for (var i in math) {
            rendered.find('#math-' + i).html(math[i]);
        }
        cb(rendered.html(), haveMath, haveCode);
    }

    MoeMark(s, {
        mathRenderer: (s, display) => {
            haveMath = true;
            mathCnt++, mathID++;
            var id = 'math-' + mathID;
            var res = '<span id="' + id + '"></span>'
            MoeditorMathRenderer.renderForExport(type, s, display, (res, id) => {
                math[id] = res;
                if (!--mathCnt && !rendering) finish();
            }, mathID);
            return res;
        }
    }, (err, val) => {
        rendered = jQuery(jQuery.parseHTML('<span>' + val + '</span>'));
        rendering = false;
        if (!mathCnt) finish();
    });
}

function html(cb) {
    render(w.content, 'html', (res, haveMath, haveCode) => {
        const doc = document.implementation.createHTMLDocument();
        const head = doc.querySelector('head');
        const meta = doc.createElement('meta');
        meta.setAttribute('charset', 'utf-8');
        head.appendChild(meta);
        const style = doc.createElement('style');
        style.innerHTML = MoeditorFile.read(require('./moe-rendertheme').getCSS(false), '').toString();
        head.appendChild(style);
        if (haveCode) {
            const styleHLJS = doc.createElement('style');
            styleHLJS.innerHTML = MoeditorFile.read(path.resolve(path.dirname(path.dirname(require.resolve('highlight.js'))), `styles/${moeApp.config.get('highlight-theme')}.css`), '').toString();
            head.appendChild(styleHLJS);
        }
        const customCSSs = moeApp.config.get('custom-csss');
        if (Object.getOwnPropertyNames(customCSSs).length !== 0) for (let x in customCSSs) if (customCSSs[x].selected) {
            let style = doc.createElement('style');
            style.innerHTML = MoeditorFile.read(customCSSs[x].fileName);
            doc.head.appendChild(style);
        }
        const body = doc.querySelector('body');
        body.id = 'container';
        body.className = 'export export-html';
        body.innerHTML = res;
        cb('<!doctype html>\n<html>\n' + doc.querySelector('html').innerHTML + '\n</html>');
    });
}

function pdf(cb) {
    render(w.content, 'pdf', (res, haveMath, haveCode) => {
        const doc = document.implementation.createHTMLDocument();
        const head = doc.querySelector('head');
        const meta = doc.createElement('meta');
        meta.setAttribute('charset', 'utf-8');
        head.appendChild(meta);
        const link = doc.createElement('link');
        link.href = require('./moe-rendertheme').getCSS(true);
        link.rel = 'stylesheet';
        head.appendChild(link);
        if (haveCode) {
            const styleHLJS = doc.createElement('style');
            styleHLJS.innerHTML = MoeditorFile.read(path.resolve(path.dirname(path.dirname(require.resolve('highlight.js'))), `styles/${moeApp.config.get('highlight-theme')}.css`), '').toString();
            head.appendChild(styleHLJS);
        }
        if (haveMath) {
            const styleMathJax = doc.createElement('style');
            styleMathJax.innerHTML = MoeditorFile.read(moeApp.Const.path + '/views/main/mathjax.css', '').toString().split('../node_modules').join('file://' + moeApp.Const.path + '/node_modules');
            head.appendChild(styleMathJax);
        }
        const customCSSs = moeApp.config.get('custom-csss');
        if (Object.getOwnPropertyNames(customCSSs).length !== 0) for (let x in customCSSs) if (customCSSs[x].selected) {
            let link = doc.createElement('link');
            link.href = customCSSs[x].fileName;
            link.rel = 'stylesheet';
            doc.head.appendChild(link);
        }
        const body = doc.querySelector('body');
        body.id = 'container';
        body.className = 'export export-pdf';
        body.innerHTML = res + ' \
<script> \
    const ipcRenderer = require(\'electron\').ipcRenderer; \
    window.onload = (function() { \
        ipcRenderer.send(\'ready-export-pdf\'); \
    }); \
</script> \
        ';
        cb(doc.querySelector('html').innerHTML);
    });
}

function blog(cb) {
    render(w.content, 'blog', (res, haveMath, haveCode) => {

        String.prototype.escapeHtml = function() {
            let map = {
                '&amp;': '&',
                '&lt;': '<',
                '&gt;': '>',
                '&quot;': '"',
                "&#039;": "'"
            };
            
            return this.replace(/&amp;|&lt;|&gt;|&quot;|&#039/g, function(m) { return map[m]; });
        };


        const doc = document.implementation.createHTMLDocument();
        const head = doc.querySelector('head');
        const charset = doc.createElement('meta');
        charset.setAttribute('charset', 'utf-8');
        head.appendChild(charset);

        var title = res.match(/\<h1.*\>.*(?=\<\/h1\>)/gi);
        if ( title ) {
            title = title.join('').replace(/\<h1.*\>/gi, "");
            
            const tl = doc.createElement('title');
            tl.innerHTML = title;
            head.appendChild(tl);

            const ogtl = doc.createElement('meta');
            ogtl.setAttribute('property','og:title');
            ogtl.setAttribute('content',title);
            head.appendChild(ogtl);
            res = res.replace(/\<h1.*\>.*\<\/h1\>/gi, "");
        }

        const description = doc.createElement('meta');
        description.setAttribute('name', 'description');
        description.setAttribute('content', res.replace(/\<.*?\>/g, "").substring(0, 100));
        head.appendChild(description);

        const ogdesc = doc.createElement('meta');
        ogdesc.setAttribute('property', 'og:description');
        ogdesc.setAttribute('content', res.replace(/\<.*?\>/g, "").substring(0, 100));
        head.appendChild(ogdesc);

        var img = res.escapeHtml();
        img = img.match(/\<img.*?src=[\"|\'].*?[\"|\'].*?\>/);
        if ( img ) {
            img = img[0].replace(/\<img.*?src=["|']/, "").replace(/["|'].*?\>/, "");
            const ogimg = doc.createElement('meta');
            ogimg.setAttribute('property', 'og:image');
            ogimg.setAttribute('content', img);
            head.appendChild(ogimg);
        }
        
        /*
        <!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-136963826-1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'UA-136963826-1');
</script>
*/
        const google_analytics = doc.createElement('script');
        google_analytics.async = true;
        google_analytics.src = "https://www.googletagmanager.com/gtag/js?id=UA-136963826-1";
        head.appendChild(google_analytics);

        const google_analytics_script = doc.createElement('script');
        google_analytics_script.setAttribute('type', 'eval');
        google_analytics_script.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
        
            gtag('config', 'UA-136963826-1');
        `;
        head.appendChild(google_analytics_script);

        const post_redirect = doc.createElement('script');
        post_redirect.src = "/resource/js/post-redirect.js";
        post_redirect.type = "text/javascript";
        head.appendChild(post_redirect);

        const style = doc.createElement('style');
        style.innerHTML = MoeditorFile.read(require('./moe-rendertheme').getCSS(false), '').toString();
        head.appendChild(style);
        
        if (haveCode) {
            const styleHLJS = doc.createElement('style');
            styleHLJS.innerHTML = MoeditorFile.read(path.resolve(path.dirname(path.dirname(require.resolve('highlight.js'))), `styles/${moeApp.config.get('highlight-theme')}.css`), '').toString();
            head.appendChild(styleHLJS);
        }
        
        const customCSSs = moeApp.config.get('custom-csss');
        if (Object.getOwnPropertyNames(customCSSs).length !== 0) for (let x in customCSSs) if (customCSSs[x].selected) {
            let style = doc.createElement('style');
            style.innerHTML = MoeditorFile.read(customCSSs[x].fileName);
            doc.head.appendChild(style);
        }
        
        const content = doc.createElement('div');
        content.id = "container";
        content.className = "export export-html";
        content.innerHTML = "<hr>"+res;

        const disqus = doc.createElement('div');
        disqus.id = "disqus_thread";

        const disqusScript = doc.createElement('script');
        disqusScript.setAttribute('type', 'eval')
        disqusScript.innerHTML = `(function() {
            var d = document, s = d.createElement('script');
            s.src = 'https://mobbing-kr.disqus.com/embed.js';
            s.setAttribute('data-timestamp', +new Date());
            (d.head || d.body).appendChild(s);
		})();`;

		const markdwon_body = doc.createElement('div');
		markdwon_body.className = "markdown-body";

        markdwon_body.appendChild(content);
        markdwon_body.appendChild(disqus);
		markdwon_body.appendChild(disqusScript);

        const card_body = doc.createElement('div');
		card_body.className = "card-body";
		card_body.appendChild(markdwon_body);

        const body = doc.querySelector('body');
        body.appendChild(card_body);
        cb('<!doctype html>\n<html>\n' + doc.querySelector('html').innerHTML + '\n</html>', title);
    });
}

var flag = false;
if (!flag) {
    flag = true;
    const ipcRenderer = require('electron').ipcRenderer;
    const MoeditorAction = require('electron').remote.require('./moe-action');
    ipcRenderer.on('action-export-html', () => {
        MoeditorAction.exportAsHTML(w.window, (cb) => {
            html(cb);
        });
    });

    ipcRenderer.on('action-export-pdf', () => {
        MoeditorAction.exportAsPDF(w.window, (cb) => {
            pdf(cb);
        });
    });

    ipcRenderer.on('action-export-blog', () => {
        MoeditorAction.exportAsBLOG(w.window, (cb) => {
            blog(cb);
        });
    });
}

module.exports = {
    html: html,
    pdf: pdf,
    blog: blog
};
