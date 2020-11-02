(function() {
  var expand, wiki, location

  expand = text => {
    return wiki.resolveLinks(
      text,
      (intext) => intext
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*(.+?)\*/g, '<i>$1</i>')
    )
  }

  function validateDomain(url) {
    const re = /^(?:https?:)?\/\/(([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}(:[0-9]{2,})?)(\/|$)/i
    const matchData = url.match(re)
    const src = url
    if (matchData) {
      const hostname = matchData[1]
      return {src, hostname}
    } else {
      const error = 'Error: frame src must include domain name'
      return {src, error}
    }
  }

  function parse(text) {
    const [src, ...rest] = text.split("\n")
    var result = validateDomain(src)
    const re = /^HEIGHT (\w+)/
    const caption = rest.filter(line => !re.test(line)).join("\n")
    let height
    for (let line of rest) {
      var matchData = line.match(re)
      if (matchData) {
        height = matchData[1]
        break
      }
    }
    result.sandbox = 'allow-scripts'
    result.caption = caption
    result.height = height
    return result
  }

  function advertiseMessages(frame) {
    return event => {
      frame.contentWindow.postMessage({
        wiki: {
          identifiers: {
            pagekey: frame.dataset.pagekey,
            frameid: frame.dataset.frameid
          },
          accepts: ['showResult', 'doInternalLink', 'importer', 'resize']
        }
      }, '*')
      console.log('greeted the frame.contentWindow')
    }
  }

  function drawFrame($item, item, parsed) {
    $item.append('<iframe></iframe><p></p>')
    const $page = $item.parents('.page')
    const frame = $item.find('iframe').get(0)
    frame.dataset.pagekey = $page.data('key')
    frame.dataset.frameid = frameId()
    frame.addEventListener('load', advertiseMessages(frame))
    $item.find('iframe').attr({
      width: '100%',
      style: 'border: none;',
      src: parsed.src,
      sandbox: parsed.sandbox
    })
    if (parsed.height) {
      $item.find('iframe')
        .attr('height', parsed.height)
    } else {
      frame.addEventListener('load', event => resize(frame))
    }
    $item.find('p').html(expand(parsed.caption))
  }

  function resize(frame) {
    try {
      frame.style.height = `${frame.contentWindow.document.body.scrollHeight}px`
    } catch (err) {
      if ((err instanceof DOMException) && /cross-origin/.test(err.message)) {
        console.error('wiki frame resize does not work for cross-origin content', err)
      }
    }
  }

  function frameId() {
    return Math.floor(Math.random()*1e18).toString(16)
  }

  function drawError($item, item, parsed) {
    $item.append(`
        <pre class="error">${parsed.error}</pre>
        <pre>${item.text}</pre>`)
  }

  function emit($item, item) {
    const parsed = parse(item.text)
    $item.css({
      'background-color': '#eee',
      'padding': '15px'
    })
    if (!parsed.hasOwnProperty('error')) {
      drawFrame($item, item, parsed)
    } else { // display error
      drawError($item, item, parsed)
    }
    return $item
  }

  function bind($item, item) {
    return $item.dblclick(() => {
      return wiki.textEditor($item, item)
    })
  }

  function showImporter(pages, options={}) {
    const result = wiki.newPage({title:"Import from Frame"})
    // Importer plugin expects to compute dates from journals in
    // pages. here we hack a default date to allow frame authors to
    // create pages without journals
    const date = new Date();
    for (let p of Object.values(pages)) {
      if (typeof p.journal === "undefined" || p.journal == null) {
        p.journal = [{date}]
      }
    }
    result.addParagraph(`Import of ${Object.keys(pages).length} pages.`)
    result.addItem({type: 'importer', pages})
    wiki.showResult(result, options)
  }

  function frameListener(event) {
    const {data} = event;
    const {action, keepLineup=false, frameid=null, pagekey=null, page=null, pages={}, title=null} = data.wiki;
    let options

    const $page = $('.page').filter(function() {
      return $(this).data('key') === pagekey
    });

    switch (action) {
    case "showResult":
      options = keepLineup ? {} : {$page}
      wiki.showResult(wiki.newPage(page), options)
      break
    case "doInternalLink":
      if (keepLineup) {
        wiki.doInternalLink(title)
      } else {
        wiki.doInternalLink(title, $page)
      }
      break
    case "importer":
      options = keepLineup ? {} : {$page}
      showImporter(pages, options)
      break
    case "resize":
      const frame = $page.find(`iframe[data-frameid="${frameid}"]`).get(0)
      if (frame) {
        resize(frame)
      } else {
        console.error('wiki frame resize could not find frameid for pagekey', {frameid, pagekey})
      }
      break
    default:
      console.error({where:'frameListener', message: "unknown action", data})
    }
  }

  if (typeof window !== "undefined" && window !== null) {
    wiki = window.wiki
    location = window.location;
    window.plugins.frame = {emit, bind}
    if (typeof window.frameListener !== "undefined" || window.frameListener == null) {
      window.frameListener = frameListener
      window.addEventListener("message", frameListener)
    }
  }

  if (typeof module !== "undefined" && module !== null) {
    wiki = {resolveLinks: (text, escape) => escape(text)}
    location = {hostname: 'example.com'}
    module.exports = {expand, parse}
  }

}).call(this)
