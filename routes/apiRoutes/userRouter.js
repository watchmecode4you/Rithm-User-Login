const express = require("express")
const router = express.Router()
const userController = require("../../controllers/userController")

router.get('/', userController.showAllUsers)
router.get('/:id', userController.showUser)
router.patch('/:id', userController.updateUser)
// router.delete('/:id', userController.whoIsVisitor, userController.deleteUser)
router.post('/', userController.createUser)
router.post('/login', userController.loginUser)
router.post('/logout', userController.logoutUser)


module.exports = router