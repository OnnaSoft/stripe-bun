# stripe-bun

A Stripe client implementation optimized for the Bun runtime.

## Description

stripe-bun is a lightweight and efficient Stripe API client designed specifically for use with the Bun JavaScript runtime. It provides a custom HTTP client implementation that works seamlessly with Bun's networking capabilities.

## Installation

You can install stripe-bun using npm:

```
npm install @onnasoft/stripe-bun
```

Or using Bun:

```
bun add @onnasoft/stripe-bun
```

## Usage

Here's a basic example of how to use stripe-bun:

```javascript
import { Stripe } from '@onnasoft/stripe-bun';

const stripe = new Stripe('your_stripe_secret_key');

async function createCustomer() {
  try {
    const customer = await stripe.customers.create({
      email: 'customer@example.com',
      name: 'John Doe'
    });
    console.log('Customer created:', customer);
  } catch (error) {
    console.error('Error creating customer:', error);
  }
}

createCustomer();
```

## Features

- Custom HTTP client optimized for Bun
- Full TypeScript support
- Comprehensive Stripe API coverage
- Efficient error handling

## API Documentation

For detailed API documentation, please refer to the [Stripe API Reference](https://stripe.com/docs/api).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any problems or have any questions, please open an issue on the [GitHub repository](https://github.com/onnasoft/stripe-bun/issues).

## Acknowledgements

- [Stripe](https://stripe.com) for their excellent payment processing API
- [Bun](https://bun.sh) for the fast JavaScript runtime

## Disclaimer

This project is not officially associated with or endorsed by Stripe, Inc.