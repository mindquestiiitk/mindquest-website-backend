import express from "express";
import { db } from "../config/firebase.config.js";
import { compatResponse } from "../utils/compatibility.js";
import logger from "../utils/logger.js";

const router = express.Router();

// In-memory data for seeding
const merchData = {
  sale: {
    endDate: "2025-02-07T23:59:59",
    tickerText:
      "Limited Time Offer! Grab your favorite merch before the sale ends!",
  },
  products: [
    {
      id: 1,
      name: "Gryffindor",
      material: "Single Jersy Cotton | 210 gsm | Regular fit",
      image: [
        "https://res.cloudinary.com/dbzn4dpnn/image/upload/v1738735271/8_rdizpc.png",
        "https://res.cloudinary.com/dbzn4dpnn/image/upload/v1738735272/9_ko7f8d.png",
      ],
      price: 400.0,
      discounted_price: 349.0,
    },
    {
      id: 2,
      name: "Slytherin",
      material: "Single Jersy Cotton | 210 gsm | Regular fit",
      image: [
        "https://res.cloudinary.com/dbzn4dpnn/image/upload/v1738735273/12_lg2rkh.png",
        "https://res.cloudinary.com/dbzn4dpnn/image/upload/v1738735269/13_ppdjmj.png",
      ],
      price: 400.0,
      discounted_price: 349.0,
    },
    {
      id: 4,
      name: "Ravenclaw",
      material: "Single Jersy Cotton | 210 gsm | Regular fit",
      image: [
        "https://res.cloudinary.com/dbzn4dpnn/image/upload/v1738735270/3_vet0m0.png",
        "https://res.cloudinary.com/dbzn4dpnn/image/upload/v1738735269/4_zdkuya.png",
      ],
      price: 400.0,
      discounted_price: 349.0,
    },
    {
      id: 5,
      name: "IIIT K",
      material: "Single Jersy Cotton | 210 gsm | Regular fit",
      image: [
        "https://res.cloudinary.com/dbzn4dpnn/image/upload/v1738735272/10_f9yhlh.png",
      ],
      price: 400.0,
      discounted_price: 349.0,
    },
  ],
};

// Seed products data
const seedProducts = async () => {
  try {
    for (const product of merchData.products) {
      await db.collection("products").doc(product.id.toString()).set(product);
    }
    console.log("Products seeded successfully");
  } catch (error) {
    console.error("Error seeding products:", error);
  }
};

// Call seedProducts to populate the products collection
seedProducts();

router.get("/products", async (req, res) => {
  try {
    const productsSnapshot = await db.collection("products").get();
    const products = productsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Use compatibility utility to handle both formats
    compatResponse(req, res, products, "Products retrieved successfully");
  } catch (error) {
    logger.error("Error fetching products", { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch products",
        code: "fetch_error",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/sales", async (req, res) => {
  try {
    const saleSnapshot = await db.collection("sales").limit(1).get();
    const sale = saleSnapshot.docs[0]?.data();
    if (!sale) {
      logger.warn("No sale found");
      return res.status(404).json({
        success: false,
        error: {
          message: "No sale found",
          code: "not_found",
        },
        timestamp: new Date().toISOString(),
      });
    }
    // Use compatibility utility to handle both formats
    compatResponse(req, res, sale, "Sale retrieved successfully");
  } catch (error) {
    logger.error("Error fetching sale", { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch sale",
        code: "fetch_error",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
