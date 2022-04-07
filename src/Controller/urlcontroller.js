const urlModel = require("../Models/urlModel")
const validUrl = require('valid-url')
const shortid = require('shortid')

const baseUrl = 'http://localhost:3000'

const redis = require("redis");

const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
    19194,
  "redis-19194.c264.ap-south-1-1.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("5z3ZfKA9XCiE5a3xkRb3yv1GTEhkVpuE", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});


const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

const isValid = function (value) {
  if (typeof (value) == "undefined" || typeof (value) == "null") { return false }
  if (typeof (value) == "string" && value.trim().length == 0) { return false }
  if (typeof (value) == "string" && value.trim().length > 1) { return true }
  return true
}
const createUrl = async function (req, res) {

    try {
        if (!validUrl.isUri(baseUrl)) {
            return res.status(401).send('Invalid base URL')
        }

        let longUrl = req.body.longUrl
        if(Object.keys(req.body)==0){return res.status(400).send('data  is missing')}

        const req0 = isValid(longUrl)
        if (!req0) {
            return res.status(400).send("longUrl is required")
        }





        if (validUrl.isUri(longUrl)) {

            let cahcedProfileData = await GET_ASYNC(`${req.body.longUrl}`)
       if(cahcedProfileData) { res.send(cahcedProfileData)}
       else{
            let finddoc = await urlModel.findOne({ longUrl: longUrl })
            
            if (finddoc) {
            
              
               let stored = finddoc
               let finalData = { longUrl: stored.longUrl, shortUrl: stored.shortUrl, urlCode: stored.urlCode }
               await SET_ASYNC(`${req.body.longUrl}`, JSON.stringify(finalData),"EX",50)
               res.status(201).send({ status: true, data: finalData })
           
           

         }else {
                let urlCode = shortid.generate()
                let findurlcode = await urlModel.findOne({ urlCode: urlCode })  
                if (findurlcode) return res.status(409).send({ msg: "url code already exist generate again" })

                const shortUrl = baseUrl + '/' + urlCode

                url = await urlModel.create({ longUrl, shortUrl, urlCode })

                let details = await urlModel.findOne(url)
                
                  let stored = details
                let finalData = { longUrl: stored.longUrl, shortUrl: stored.shortUrl, urlCode: stored.urlCode }
                await SET_ASYNC(`${req.body.longUrl}`, JSON.stringify(finalData))
                await SET_ASYNC(`${finalData.urlCode}`,finalData.longUrl)  

               res.status(201).send({ status: true, data: finalData })
             

            }
        }
        } else {
            return res.status(404).send({ status: false, data: "Invalid url" })
        }

    } catch (error) {
        res.status(500).send(error.message)
    }
}


const getUrl = async function (req, res) {
    try {

        let urlCode = req.params.urlCode;

        let cahcedProfileData = await GET_ASYNC(`${urlCode}`)
        if(cahcedProfileData) { res.redirect(cahcedProfileData)}
      else{
        let findUrlCode = await urlModel.findOne({ urlCode: urlCode })
        console.log(findUrlCode)
        if (!findUrlCode) return res.status(404).send({ status: false, message: "URL Code doesn't exists" })

        let url = findUrlCode.longUrl;

        return res.status(302).redirect( url)
    }
    }
    catch (error) {
        res.status(500).send({ status: false, data: error.message })
    }
}




module.exports.createUrl = createUrl
module.exports.getUrl = getUrl

