const fs = require('fs')
const inquirer = require('inquirer')
const puppeteer = require('puppeteer')
const GIFEncoder = require('gif-encoder')
const getPixels = require('get-pixels')
const workDir = './temp/'

if (!fs.existsSync(workDir)) {
  fs.mkdirSync(workDir)
}

let file = fs.createWriteStream('output/recording-' + Date.now() + '.gif')

const encoder = new GIFEncoder(800, 800)

// Setup gif encoder parameters
encoder.setDelay(100)
encoder.pipe(file)
encoder.setQuality(60)
encoder.writeHeader()
encoder.setRepeat(0)

// Helper functions declaration
function addToGif (images, counter = 0) {
  getPixels(images[counter], function (err, pixels) {
    encoder.addFrame(pixels.data)
    encoder.read()
    if (counter === images.length - 1) {
      encoder.finish()
      console.log('Gif created!')
      process.exit(0)

      cleanUp(images, function (err) {
        if (err) {
          console.log(err)
        } else {
          fs.rmdirSync(workDir)
          console.log('Gif created!')
          process.exit(0)
        }
      })
    } else {
      addToGif(images, ++counter)
    }
  })
}

function cleanUp (listOfPNGs, callback) {
  let i = listOfPNGs.length
  listOfPNGs.forEach(function (filepath) {
    fs.unlink(filepath, function (err) {
      i--
      if (err) {
        callback(err)
      } else if (i <= 0) {
        callback(null)
      }
    })
  })
}

async function setup () {
  const options = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'browser',
      message: 'Show browser when running?',
      default: false
    },
    {
      type: 'input',
      name: 'url',
      message: 'URL to capture?',
      default: 'https://count-up.netlify.com/'
    },
    {
      type: 'input',
      name: 'duration',
      message: 'Recording duration (in seconds)',
      default: 3
    }
  ])

  return Promise.resolve(options)
}

async function timer () {
  await set
}

(async () => {
  const options = await setup()
  const browser = await puppeteer.launch({ headless: !options.browser })
  const page = await browser.newPage()
  await page.goto(options.url)

  page.setViewport({ width: 800, height: 800 })

  const frameCount = options.duration * 16

  for (let i = 0; i < frameCount; i++) {
    await page.screenshot({ path: workDir + i + '.png' })
  }

  await browser.close()

  let listOfPNGs = fs
    .readdirSync(workDir)
    .map(a => a.substr(0, a.length - 4) + '')
    .sort(function (a, b) {
      return a - b
    })
    .map(a => workDir + a.substr(0, a.length) + '.png')

  addToGif(listOfPNGs)
})()

process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p)
    process.exit(1)
  })
  .on('uncaughtException', err => {
    console.error(err, 'Uncaught Exception thrown')
    process.exit(1)
  })
