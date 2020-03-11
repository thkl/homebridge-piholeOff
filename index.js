
var Service, Characteristic
var http = require('http')

const baseURL = '/admin/api.php'

class pihole {
  constructor (log, config) {
    this.log = log

    this.manufacturer = config.manufacturer || 'My manufacturer'
    this.model = config.model || 'PiHoleOff'
    this.serial = config['serial-number'] || '123-456-789'
    this.name = 'PiholeOff'

    this.auth = config.auth || ''
    this.host = config.host || 'localhost'
    this.time = config.time || 0
    this.port = config.port || 80
    // logLevel 0: disabled, 1: error, 2: info
    if (typeof config.logLevel === 'undefined') {
      this.logLevel = 1
    } else {
      this.logLevel = config.logLevel
    }
    this.remainTime = this.time
    this.log.info('init done')
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
        let isDisabled = await self.getStatus()
        self.log.debug('get is off %s', isDisabled)
        callback(null, isDisabled)
      })

      .on('set', async (active, callback) => {
        await self.setStatus((active === true))
        self.log.debug('set is off %s', active)

        if (active === true) {
          self.infinity = (self.time === 0)
          self.remainTime = self.time
        }
        callback()
      })

    let setDurationCharacteristic = this.serviceItem.getCharacteristic(Characteristic.SetDuration)
      .on('get', function (callback) {
        callback(null, self.time)
      })
      .on('set', function (value, callback) {
        self.time = value
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
      this._makeRequest('?status').then((isDisabled) => {
        if (!isDisabled) {
          self.remainTime = -1
        }
        self.isActive.updateValue(isDisabled, null)
        resolve(isDisabled)
      }, (error) => { reject(error) })
    })
  }

  setStatus (newVal) {
    let self = this
    return new Promise((resolve, reject) => {
      clearInterval(this.timer)
      if (newVal) {
        self.log.debug('setOn %s', newVal)
        this.timer = setInterval(() => {
          self.remainTime = self.remainTime - 1
          self.log.debug('time remain %s', self.remainTime)
          if (self.remainTime < 0) {
            clearInterval(self.timer)
            self.getStatus()
          }
          self.chrRemainTime.updateValue(self.remainTime, null)
        }, 1000)
      }
      this._makeRequest((!newVal ? '?enable' : ('?disable=' + this.time)) + '&auth=' + this.auth).then((isDisabled) => {
        setTimeout(() => { self.getStatus() }, 500)
        resolve(isDisabled)
      }, (error) => { reject(error) })
    })
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
              resolve(jsonBody.status === 'disabled')
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
  hb.registerAccessory('homebridge-piholeOff', 'PiholeOff', pihole)
}
