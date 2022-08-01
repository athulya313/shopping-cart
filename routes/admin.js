var express = require('express');
const { response } = require('../app');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');

/* GET users listing. */
router.get('/', function(req, res, next) {
  productHelpers.getAllProducts().then((products)=>
  {
    console.log(products)
    res.render('admin/view-products', {products ,admin:true});
  })
  
 
});
    router.get('/add-products',function(req,res){
      res.render('admin/add-products');
    })
    router.post('/add-products',function(req,res)
    {
      
      productHelpers.addProduct(req.body,(id)=>{
        let image=req.files.image
        console.log(id );
        console.log(req.body);
        image.mv('./public/product-images/'+id+'.jpg',(err,done)=>
        {
          if(!err)
          {
            res.render("admin/add-products");
          }
          else{
            console.log(err);
          }
        })
      }
      )
    })
    router.get('/delete-product/:id',(req,res)=>{
    let proId=req.params.id
    console.log(proId);
    productHelpers.deleteProduct(proId).then((response)=>{
      res.redirect('/admin')
    })
    })
    router.get('/edit-product/:id',async(req,res)=>{
      let product=await productHelpers.getProductDetail(req.params.id)
      console.log(product)
      res.render('admin/edit-product',{product})
    })
    router.post('/edit-product/:id',(req,res)=>
      {
        console.log(req.params.id);
        let id=req.params.id
       productHelpers.updateProduct(req.params.id,req.body).then(()=>{
        res.redirect('/admin')
        if(req.files.image){
          let image=req.files.image
          image.mv('./public/product-images/'+id+'.jpg')
        }
        
       })
      })
      router.get('/all-orders',(req,res)=>{
        
     userHelpers.orderDetails().then((orderedItems)=>{
      console.log(orderedItems)
      res.render('admin/all-orders',{orderedItems,admin:true})
     })
        
      })
      router.get('/shipping-placed/:id',(req,res)=>{
        userHelpers.ChangeShippingStatus(req.params.id).then(()=>{
          res.redirect('/admin/all-orders')

        })
        

      })
      router.get('/all-users',(req,res)=>{
        userHelpers.getUser().then((userdetail)=>{
          console.log(userdetail);
          res.render('admin/all-users',{userdetail,admin:true}) 
        })
        
      })
      router.get('/products',(req,res)=>{
        userHelpers.getProducts().then((productdetail)=>{
           res.render('admin/products',{productdetail,admin:true}) 
        })
        
      })


module.exports = router;
