
var Service, Characteristic, homebridge
const http = require('http')
const fs = require('fs')
const path = require('path')
const baseURL = '/admin/api.php'

class pihole {
  constructor (log, config) {
    this.log = log

    this.manufacturer = config.manufacturer || 'My manufacturer'
    this.model = config.model || 'PiHoleOff'
    this.serial = config['serial-number'] || '123-456-789'
    this.name = 'PiholeOff'
    this.time = config.time || 0 // this will be overriden by the homekit setDuration and stored persistent
    this.auth = config.auth || ''
    this.host = config.host || 'localhost'
    this.port = config.port || 80
    this.urlEnabled = config.urlEnabled
    this.urlDisabled = config.urlDisabled
    // logLevel 0: disabled, 1: error, 2: info
    if (typeof config.logLevel === 'undefined') {
      this.logLevel = 1
    } else {
      this.logLevel = config.logLevel
    }
    this.loadPersistentData()
    this.remainTime = this.time
    this.log.info('init done')
  }

  loadPersistentData () {
    let strFile = path.join(homebridge.user.storagePath(), this.serial + '.json')
    if (fs.existsSync(strFile)) {
      try {
        this.time = JSON.parse(fs.readFileSync(strFile))
      } catch (e) {
        this.time = 0
      }
    }
  }

  savePersistentData () {
    let strFile = path.join(homebridge.user.storagePath(), this.serial + '.json')
    fs.writeFileSync(strFile, JSON.stringify(this.time))
  }

  getServices () {
    let self = this
    this.infoService = new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial)

    this.serviceItem = new Service.Switch(this.name)
    this.serviceItem.addOptionalCharacteristic(Characteristic.SetDuration)
    this.serviceItem.addOptionalCharacteristic(Characteristic.RemainingDuration)

    this.isActive = this.serviceItem
      .getCharacteristic(Characteristic.On)
      .on('get', async (callback) => {
        let isEnabled = await self.getStatus()
        self.log.debug('get is off %s', isEnabled)
        callback(null, isEnabled)
      })

      .on('set', async (active, callback) => {
        await self.setStatus((active === true))
        self.log.debug('set is off %s', active)

        if (active === false) {
          self.infinity = (self.time === 0)
          self.remainTime = self.time
          self.log.debug('Infinity %s Time %s ', self.infinity, self.remainTime)
        }
        callback()
      })

    let setDurationCharacteristic = this.serviceItem.getCharacteristic(Characteristic.SetDuration)
      .on('get', function (callback) {
        callback(null, self.time)
      })
      .on('set', function (value, callback) {
        self.time = value
        self.savePersistentData()
        self.log.debug('set new duration')
        if ((self.remainTime > -1) || (self.infinity === true)) {
          self.remainTime = self.time
          self.infinity = (self.time === 0)
          self.setStatus(true)
        }

        callback()
      })

    setDurationCharacteristic.updateValue(this.time, null)

    this.chrRemainTime = this.serviceItem.getCharacteristic(Characteristic.RemainingDuration)
      .on('get', function (callback) {
        self.log.debug('getRemaining time %s', self.remainTime)
        callback(null, self.remainTime)
      })

    // Initial Query
    setTimeout(() => {
      self.getStatus()
    }, 1000)

    return [this.infoService, this.serviceItem]
  }

  getStatus () {
    let self = this
    return new Promise((resolve, reject) => {
      this._makeRequest('?status').then((isEnabled) => {
        if (isEnabled) {
          self.remainTime = -1
          self._makeReportStatusRequest(isEnabled)
        }
        self.isActive.updateValue(isEnabled, null)
        resolve(isEnabled)
      }, (error) => { reject(error) })
    })
  }

  setStatus (newVal) {
    let self = this
    return new Promise((resolve, reject) => {
      clearInterval(this.timer)
      if (newVal === false) {
        self.log.debug('setOn %s', newVal)
        this.timer = setInterval(() => {
          self.remainTime = self.remainTime - 1
          if (self.remainTime < 0) {
            clearInterval(self.timer)
            self.getStatus()
          }
          self.chrRemainTime.updateValue(self.remainTime, null)
        }, 1000)
      }
      this._makeRequest((newVal ? '?enable' : ('?disable=' + this.time)) + '&auth=' + this.auth).then((isEnabled) => {
        setTimeout(() => { self.getStatus() }, 500)
        self._makeReportStatusRequest(isEnabled)
        resolve(isEnabled)
      }, (error) => { reject(error) })
    })
  }

  _makeReportStatusRequest (isEnabled) {
    if ((isEnabled) && (this.urlEnabled)) {
      http.get(this.urlEnabled)
    }

    if ((!isEnabled) && (this.urlDisabled)) {
      http.get(this.urlDisabled)
    }
  }

  _makeRequest (path, next) {
    let self = this
    return new Promise((resolve, reject) => {
      let req = http.get({
        host: this.host,
        port: this.port,
        path: baseURL + path
      }, (res) => {
        let body = ''

        res.on('data', (data) => { body += data })
        res.on('end', () => {
          if (this.logLevel >= 2) { this.log(body) }

          try {
            let jsonBody = JSON.parse(body)

            if (jsonBody.status) {
              resolve(jsonBody.status === 'enabled')
            } else {
              reject(new Error('invalid json'))
            }
          } catch (e) {
            self.log.error(e)
            reject(e)
          }
        })
      })

      req.on('error', (err) => {
        self.log.error(err)
        reject(err)
      })
    })
  }
}

module.exports = function (hb) {
  Service = hb.hap.Service
  Characteristic = hb.hap.Characteristic
  homebridge = hb
  hb.registerAccessory('homebridge-piholeOff', 'PiholeOff', pihole)
}
