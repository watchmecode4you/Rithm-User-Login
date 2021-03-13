const db = require("../db/db")
const bcrypt = require("bcrypt")
const env = require("dotenv").config()
const jwt = require("jsonwebtoken")

function isVisitorAdmin(authHeaderValue) {
    let token = jwt.verify(authHeaderValue, process.env.JWT)
    return token.isAdmin
}

function validate(body){
    return new Promise((resolve, reject)=>{
        if(!body.hasOwnProperty(username) || body.username == "") reject(false)
        if(!body.hasOwnProperty(password) || body.password == "") reject(false)
        if(!body.hasOwnProperty(isAdmin) || body.isAdmin == "") reject(false)
        else resolve(true)
    })
}

exports.loginUser = async function (req, res, next) {
    try {
        const query = `SELECT * FROM users WHERE username = $1 LIMIT 1`
        const userFound = await db.query(query, [req.body.username])
        console.log(userFound.rows[0])

        if (userFound.rows.length === 0) {
            res.status(400).json({
                message: `User not found.`
            })
        }
        const {
            id,
            username,
            password,
            isadmin
        } = userFound.rows[0]
        const hashed_password = await bcrypt.compare(req.body.password, password)

        if (!hashed_password) {
            res.status(400).json({
                message: `Password is incorrect.`
            })
        }

        const token = jwt.sign({
                id: id,
                username: username,
                isAdmin: isadmin
            },
            process.env.JWT, {
                expiresIn: 60 * 60
            }
        )
        // res.locals.user = {
        //     username: username,
        //     isAdmin: isadmin
        // }
        res.status(200).json({
            username: username,
            token: token,
            message: `User logged in`,
        })

    } catch (e) {
        next(e)
    }
}

exports.logoutUser = async function (req, res, next) {
    try {
        let authorizationValue = req.headers.authorization
        console.log(req.headers.authorization)
        let token = jwt.verify(authorizationValue, process.env.JWT)
        const {
            username
        } = token
        req.headers.authorization = ""
        console.log(req.headers)
        /* res.status(200).json({
            username: username,
            message: `User logged out`
        }) */
    } catch (e) {
        next(e)
    }
}

exports.createUser = async function (req, res, next) {
    try {
        // const validation = await validate(req.body)
        // console.log(validation)
        // if(!validation){
        //     throw error
        // }
        const username = req.body.username
        const password = await bcrypt.hash(req.body.password, 10)
        const isAdmin = req.body.isadmin

        const query = `INSERT INTO users (username, password, isadmin) values ($1, $2, $3) RETURNING *`

        const results = await db.query(query, [username, password, isAdmin])
        if (results) {
            res.status(201).json(results.rows[0])
        }
    } catch (e) {
        next(e)
    }
}

exports.showUser = function (req, res, next) {

}

exports.showAllUsers = async function (req, res, next) {
    try {
        if (isVisitorAdmin(req.headers.authorization.split(" ")[1]) === false) {
            res.json({
                message: `Unauthorized action`
            })
        }
        else if (isVisitorAdmin(req.headers.authorization.split(" ")[1]) === true) {
            const query = `SELECT * FROM USERS`
            const userList = await db.query(query)
            res.status(200).json(userList.rows)
        }

        else{
            next({error: isVisitorAdmin(req.headers.authorization.split(" ")[1])})
        }
    } catch (e) {
        next(e)
    }
}