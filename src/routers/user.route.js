const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { AsyncHandle } = require("../helpers/AsyncHandle");
const { authentication } = require("../helpers/auth");
const { uploadDisk } = require("../configs/multer.config");

/**
 * @swagger
 *  tags:
 *      name: Account
 *      description: Account management
 */

/**
 * @swagger
 *  components:
 *      schemas:
 *          Account:
 *              type: object
 *              properties:
 *                  items:
 *                      type: string
 *                      description: Name of the product
 *                      default: ""
 *                  images:
 *                      type: string
 *                      format: binary
 *                      description: List of product images
 */

/**
 * @swagger
 *  components:
 *      schemas:
 *          RegisterModel:
 *              type: object
 *              properties:
 *                  username:
 *                      type: string
 *                      description: gmail of user
 *                      default: "vuhoang250203@gmail.com"
 *                  password:
 *                      type: string
 *                      description: password of account
 *                      default: "123"
 */

/**
 * @swagger
 * /login:
 *  post:
 *      summary: Login
 *      tags: [Account]
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/RegisterModel'
 *      responses:
 *          200:
 *              description: login success!
 */
router.post("/login", AsyncHandle(userController.Login));

/**
 * @swagger
 *  /register:
 *      post:
 *          summary: Register a new user
 *          tags: [Account]
 *          requestBody:
 *              required: true
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              name:
 *                                  type: string
 *                                  default: "client@gmail.com"
 *                              email:
 *                                  type: string
 *                                  default: "client@gmail.com"
 *                              password:
 *                                  type: string
 *                                  default: "123"
 *          responses:
 *              200:
 *                  description: Register successful
 *              400:
 *                  description: Invalid input
 */
router.post("/register", AsyncHandle(userController.Register));

/**
 * @swagger
 *  /handleRF:
 *      post:
 *          summary: Refresh token
 *          tags: [Account]
 *          parameters:
 *              - $ref: '#/components/parameters/RefreshToken'
 *          responses:
 *              200:
 *                  description: success
 *              401:
 *                  description: Unauthorized (token invalid or missing)
 */
router.post("/handleRF", authentication, AsyncHandle(userController.HandleRF));

/**
 * @swagger
 *  /get-me:
 *      get:
 *          summary: Get me
 *          tags: [Account]
 *          security:
 *              - bearerAuth: []
 *          responses:
 *              200:
 *                  description: success
 *              400:
 *                  description: Can not get info
 */
router.get("/get-me", authentication, AsyncHandle(userController.GetMe));

/**
 * @swagger
 *  /update-me:
 *      patch:
 *          summary: Update me
 *          tags: [Account]
 *          security:
 *              - bearerAuth: []
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data:
 *                      schema:
 *                          $ref: '#/components/schemas/Account'
 *          responses:
 *              200:
 *                  description: success
 *
 */
router.patch(
  "/update-me",
  authentication,
  uploadDisk.fields([{ name: "images", maxCount: 1 }]),
  AsyncHandle(userController.Update)
);

/**
 * @swagger
 * /update-password:
 *   patch:
 *     summary: Update user password
 *     tags: [Account]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: New password for the account
 *               newPassword:
 *                  type: string
 */
router.patch(
  "/update-password",
  authentication,
  AsyncHandle(userController.UpdatePassword)
);

router.get("/users", authentication, AsyncHandle(userController.GetUsers));

module.exports = router;
