export class WikiMessenger {
  constructor() {
    if (window.parent !== window) {
      this.insideFrame = true
    } else {
      console.error('WikiMessenger expects to be in an iframe')
      this.insideFrame = false
    }
  }
  acceptIdentifiers(event) {
    console.log('WikiMessenger.acceptIdentifiers()', event.data)
    if (! this.insideFrame) {
      return
    }
    if (event.data.hasOwnProperty('wiki')) {
      this.identifiers = event.data.wiki.identifiers
    }
  }
  post(action, data) {
    if (! this.insideFrame) {
      console.error('WikiMessenger missing window.parent. post() ignored', {action, data})
      return
    }
    if (! this.identifiers) {
      console.error('WikiMessenger.post() called before acceptIdentifiers()', {action, data})
      return
    }
    window.parent.postMessage({
      wiki: {
        action,
        ...data,
        keepLineup: event.shiftKey,
        ...(this.identifiers)
      }
    }, '*')
  }
  showResult(page) {
    this.post('showResult', {page})
  }
  doInternalLink(title) {
    this.post('doInternalLink', {title})
  }
  importer(pages) {
    this.post('importer', {pages})
  }
  resize() {
    this.post('resize', {})
  }
}
