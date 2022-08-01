const { response } = require('express');
var express = require('express');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers')
var userHelpers=require('../helpers/user-helpers')

/* GET home page. */
const verifyLogin=(req,res,next)=>{
  if(req.session.user){
    next()
  }else{
    res.redirect('/login')
  }
}
router.get('/', async function(req, res, next) {
  let user=req.session.user
  console.log(user)
  let cartCount=null
  if(req.session.user){
    cartCount=await userHelpers.getCartCount(req.session.user._id)
  }
  productHelpers.getAllProducts().then((products)=>
  {
  
    res.render('user/view-products',{products,admin:false,user,cartCount});
  })
  
  });
  router.get('/login',function(req,res)
  {
    if(req.session.user){
     res.redirect('/') 
    }else{
    res.render('user/login',{loginErr:req.session.LoginErr})
    req.session.LoginErr=false   
    } 
  })
  router.get('/signup',function(req,res)
  {
    res.render('user/signup')
  })
  router.post('/signup',(req,res)=>
  {
   userHelpers.doSignUp(req.body).then((response)=>
   {
    console.log(req.body)
     req.session.user=response
     req.session.user.loggedIn=true
    
    res.redirect('/')
   })
  })
  router.post('/login',(req,res)=>{
    userHelpers.doLogin(req.body).then((response)=>
    {
      if(response.status){
        req.session.user=response.user
        req.session.user.loggedIn=true
        
        res.redirect('/')
      }else{
        req.session.LoginErr=true
        res.redirect('/login')
      }
    })
  })
  router.get('/logout',(req,res)=>{
    req.session.user=null
    res.redirect('/')
  })
  router.get('/cart',verifyLogin,async(req,res)=>{
    
    let products=await userHelpers.getCartProducts(req.session.user._id)
    let totalValue=0
    if(products.length>0)
    {
     totalValue=await userHelpers.getTotalAmount(req.session.user._id)
    }
    let user=req.session.user._id
   res.render('user/cart',{products,totalValue,user})
    
  })

  router.get('/add-to-cart/:id',(req,res)=>{
  console.log("api calls");
   userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
      res.json({status:true})
    
    })
  })
  router.post('/change-product-quantity',(req,res,next)=>{
       
     userHelpers.changeProductQuantity(req.body).then(async (response)=>{
      response.total=await userHelpers.getTotalAmount(req.body.user)
       res.json(response)

   })
  })
  router.post('/remove-product',(req,res,next)=>{
    console.log(req.body);
      userHelpers.RemoveProduct(req.body).then((response)=>{
        res.json(response)
       })
  })
  router.get('/place-order',verifyLogin,async(req,res)=>{
    let total=await userHelpers.getTotalAmount(req.session.user._id)
    res.render('user/place-order',{total,user:req.session.user})
  })

    router.post('/place-order',async(req,res)=>{
      let products=await userHelpers.getCartProductList(req.body.userId)
      let totalprice=await userHelpers.getTotalAmount(req.body.userId)
      userHelpers.placeOrder(req.body,products,totalprice).then((orderId)=>{
        if(req.body['payment-method']==='COD'){
          res.json({codSuccess:true})
        }else{
          userHelpers.generateRazorPay(orderId,totalprice).then((response)=>{
            res.json(response)
          })

        }
      })
      console.log(req.body);
    })
    router.get('/order-success',(req,res)=>{
       res.render('user/order-success',{user:req.session.user})
    })
    router.get('/orders',verifyLogin,async(req,res)=>
    {
      let orders=await userHelpers.getUserOrders(req.session.user._id)
      res.render('user/orders',{user:req.session.user,orders})
    })
    router.get('/view-order-products/:id',async(req,res)=>{
      let products=await userHelpers.getOrderProducts(req.params.id)
      
      console.log(products);
      res.render('user/view-order-products',{user:req.session.user,products})
    })
    router.post('/verify-payment',(req,res)=>{
      userHelpers.verifyPayment(req.body).then(()=>{
        userHelpers.changeOrderStatus(req.body['order[receipt]']).then(()=>{
          console.log("payment successfull");
          res.json({status:true})
        })
        
      }).catch((err)=>{
        res.json({status:false})
      })
    })
    router.get('/profile',verifyLogin,async(req,res)=>{
      
       let userId=req.session.user._id
       
      let userdetail=await userHelpers.getUserDetail(userId)
      console.log(userdetail);
        
        res.render('user/profile',{userdetail,user:req.session.user})
      })
      
    

module.exports = router;
