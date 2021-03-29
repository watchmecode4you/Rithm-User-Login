const db = require("../db/db")
const bcrypt = require("bcrypt")
const env = require("dotenv").config()
const jwt = require("jsonwebtoken")
const {
    user
} = require("../db/db")

function isVisitorAdmin(authHeaderValue) {
    let token = jwt.verify(authHeaderValue, process.env.JWT)
    return token.isAdmin
}

function isVisitorLoggedIn(authHeaderValue, userId) {
    let token = jwt.verify(authHeaderValue, process.env.JWT)
    console.log(token.id, userId)
    if (token.id != userId) {
        return false
    }
    return true
}

function validate(body) {
    return new Promise((resolve, reject) => {
        if (!body.hasOwnProperty(username) || body.username == "") reject(false)
        if (!body.hasOwnProperty(password) || body.password == "") reject(false)
        if (!body.hasOwnProperty(isAdmin) || body.isAdmin == "") reject(false)
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

        //Creating the token that will be inserted in the header with an expiration date 
        // if i'm using postman for testing then i can assign the token value in the Authorization header key 
        //You can save necessary information inside the token to be retrieved in the future upon usage.
        const token = jwt.sign({
                id: id,
                username: username,
                isAdmin: isadmin
            },
            process.env.JWT, {
                expiresIn: 60 * 60
            }
        )
 
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

exports.showUser = async function (req, res, next) {
    let userId = req.params.id
    let isAdmin = isVisitorAdmin(req.headers.authorization.split(" ")[1])
    let isLoggedIn = isVisitorLoggedIn(req.headers.authorization.split(" ")[1], userId)
    try {
        if (isAdmin === false && isLoggedIn === false) {
            res.json({
                message: `Unauthorized action`
            })
        } else if (isAdmin === true || isLoggedIn == true) {
            const query = `SELECT * FROM USERS where id = $1`
            const userInfo = await db.query(query, [userId])
            if (userInfo.rows.length <= 0) res.status(200).json(`User not found`)
            else res.status(200).json(userInfo.rows[0])
        } else {
            next({
                error: `Information is not available. 
                Kindly login and try again`
            })
        }
    } catch (e) {
        next(e)
    }
}

exports.showAllUsers = async function (req, res, next) {
    let isAdmin = isVisitorAdmin(req.headers.authorization.split(" ")[1])
    try {
        if (isAdmin === false) {
            res.json({
                message: `Unauthorized action`
            })
        } else if (isAdmin === true) {
            const query = `SELECT * FROM USERS`
            const userList = await db.query(query)
            if (userList.rows.length <= 0) res.status(200).json(`No users to be found`)
            else res.status(200).json(userList.rows)
        } else {
            next({
                error: isAdmin
            })
        }
    } catch (e) {
        next(e)
    }
}

exports.updateUser = async function (req, res, next) {
    let userId = req.params.id
    let isAdmin = isVisitorAdmin(req.headers.authorization.split(" ")[1])
    let isLoggedIn = isVisitorLoggedIn(req.headers.authorization.split(" ")[1], userId)
    try {
        if (isAdmin === false && isLoggedIn === false) {
            res.json({
                message: `Cannot Update. Unauthorized action`
            })
        } else if (isAdmin === true || isLoggedIn === true) {
            let {
                password
            } = req.body

            //check if the user already exist in the database
            const check_user_query = `Select id, username FROM users WHERE id = $1`
            const userInfo = await db.query(check_user_query, [userId])
            if (userInfo.rows.length <= 0) res.status(200).json(`Cannot update information. User not found`)

            newPassword = await bcrypt.hash(password, 10)

            //update the user inforamtion 
            const update_user_query = `UPDATE users SET password = $1 where id = $2 RETURNING *`
            const updateInfo = await db.query(update_user_query, [newPassword ,userId])
            if (updateInfo.rows.length <= 0) res.status(404).json(`User was not successfully updated. Please contact your system administrator`)

            // we can login the user whenever he changes his password if the user was the one updating his own passowrd
            //But since this is an api example no need to go through this step
            // but in a real application you have to use this step and update the Json web token used if the user himself is updating his own password
            
            res.status(200).json(updateInfo.rows[0])

        } else {
            next({
                error: `Information is not available. 
                Kindly login and try again`
            })
        }
    } catch (e) {
        next(e)
    }
}

exports.deleteUser = async function (req, res, next) {
    let userId = req.params.id
    let isAdmin = isVisitorAdmin(req.headers.authorization.split(" ")[1])
    let isLoggedIn = isVisitorLoggedIn(req.headers.authorization.split(" ")[1], userId)
    try {
        if (isAdmin === false && isLoggedIn === false) {
            res.json({
                message: `Cannot delete. Unauthorized action`
            })
        } else if (isAdmin === true || isLoggedIn === true) {
            
            //delete the user from the database 
            const delete_user_query = `DELETE FROM users WHERE id = $1 RETURNING *`
            const deleteUser = await db.query(delete_user_query, [userId])
            if (deleteUser.rows.length <= 0) res.status(404).json(`User was not successfully deleted. Please contact your system administrator`)

            // we can login the user whenever he changes his password if the user was the one updating his own passowrd
            //But since this is an api example no need to go through this step
            // but in a real application you have to use this step and update the Json web token used if the user himself is updating his own password
            
            res.status(204).json(`Deleted`)

        } else {
            next({
                error: `Information is not available. 
                Kindly login and try again`
            })
        }
    } catch (e) {
        next(e)
    }
}