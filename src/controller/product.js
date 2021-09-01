const Product = require("../models/product");
const shortid = require("shortid");
const slugify = require("slugify");
const Category = require("../models/category");
const cloudinary = require("cloudinary").v2;
const formidable = require("formidable");
const { uploadImages } = require("../common-middleware");

exports.createProduct = (req, res) => {
  new formidable.IncomingForm({ multiples: true }).parse(
    req,
    async (err, fields, file) => {
      if (err) {
        return res.status(400).json({ err });
      }
      const pathArray = file.productPicture.map((pic) => pic.path);
      const urlArray = await uploadImages(pathArray);
      const { name, price, description, category, quantity, createdBy } =
        fields;

      const product = new Product({
        name: name,
        slug: slugify(name),
        price,
        quantity,
        description,
        productPictures: urlArray,
        category,
        createdBy: req.user._id,
      });

      product.save((error, product) => {
        if (error) return res.status(400).json({ error });
        if (product) {
          res.status(201).json({ product, files: req.files });
        }
      });
    }
  );
};

exports.getProductsBySlug = (req, res) => {
  const { slug } = req.params;
  Category.findOne({ slug: slug })
    .select("_id type")
    .exec((error, category) => {
      if (error) {
        return res.status(400).json({ error });
      }

      if (category) {
        Product.find({ category: category._id }).exec((error, products) => {
          if (error) {
            return res.status(400).json({ error });
          }

          if (category.type) {
            if (products.length > 0) {
              res.status(200).json({
                products,
                priceRange: {
                  under1k: 500,
                  under3k: 2000,
                  under5k: 5000,
                  under7k: 7000,
                  over7k: 99999999,
                },
                productsByPrice: {
                  under1k: products.filter((product) => product.price <= 500),
                  under3k: products.filter(
                    (product) => product.price > 500 && product.price <= 2000
                  ),
                  under5k: products.filter(
                    (product) => product.price > 2000 && product.price <= 5000
                  ),
                  under7k: products.filter(
                    (product) => product.price > 5000 && product.price <= 7000
                  ),
                  over7k: products.filter(
                    (product) => product.price > 7000 
                  ),
                },
              });
            }
          } else {
            res.status(200).json({ products });
          }
        });
      }
    });
};

exports.getProductDetailsById = (req, res) => {
  const { productId } = req.params;
  if (productId) {
    Product.findOne({ _id: productId }).exec((error, product) => {
      if (error) return res.status(400).json({ error });
      if (product) {
        res.status(200).json({ product });
      }
    });
  } else {
    return res.status(400).json({ error: "Params required" });
  }
};

// new update
exports.deleteProductById = (req, res) => {
  const { productId } = req.body.payload;
  if (productId) {
    Product.deleteOne({ _id: productId }).exec((error, result) => {
      if (error) return res.status(400).json({ error });
      if (result) {
        res.status(202).json({ result });
      }
    });
  } else {
    res.status(400).json({ error: "Params required" });
  }
};

exports.getProducts = async (req, res) => {
  const products = await Product.find({ createdBy: req.user._id })
    .select("_id name price quantity slug description productPictures category")
    .populate({ path: "category", select: "_id name" })
    .exec();

  res.status(200).json({ products });
};
