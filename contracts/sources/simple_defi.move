/// Simple IOTA DeFi Protocol for Testing and Deployment
/// Minimal working version for testnet validation
module iota_defi_protocol::simple_defi {
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::coin::{Self, Coin, TreasuryCap};
    use iota::balance::{Self, Balance};
    use iota::event;

    // Error codes
    const EInsufficientBalance: u64 = 1001;
    const EInvalidAmount: u64 = 1002;

    // Test token
    public struct SIMPLE_DEFI has drop {}

    // Protocol admin capability
    public struct ProtocolCap has key, store {
        id: UID,
    }

    // Simple liquidity pool
    public struct Pool<phantom X, phantom Y> has key {
        id: UID,
        balance_x: Balance<X>,
        balance_y: Balance<Y>,
        fee_percentage: u64,
    }

    // Events
    public struct PoolCreated has copy, drop {
        pool_id: address,
        fee_percentage: u64,
    }

    public struct SwapExecuted has copy, drop {
        pool_id: address,
        amount_in: u64,
        amount_out: u64,
    }

    // Initialize protocol
    fun init(otw: SIMPLE_DEFI, ctx: &mut TxContext) {
        // Create treasury capability for test token
        let (treasury_cap, metadata) = coin::create_currency(
            otw,
            9,
            b"DEFI",
            b"IOTA DeFi Token",
            b"Test token for IOTA DeFi Protocol",
            option::none(),
            ctx
        );

        // Create protocol admin capability
        let admin_cap = ProtocolCap {
            id: object::new(ctx),
        };

        // Transfer objects
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
        transfer::public_freeze_object(metadata);
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    // Create liquidity pool
    public fun create_pool<X, Y>(
        _: &ProtocolCap,
        fee_percentage: u64,
        ctx: &mut TxContext
    ) {
        assert!(fee_percentage <= 10000, EInvalidAmount); // Max 100%

        let pool_id = object::new(ctx);
        let pool_address = object::uid_to_address(&pool_id);

        let pool = Pool<X, Y> {
            id: pool_id,
            balance_x: balance::zero<X>(),
            balance_y: balance::zero<Y>(),
            fee_percentage,
        };

        event::emit(PoolCreated {
            pool_id: pool_address,
            fee_percentage,
        });

        transfer::share_object(pool);
    }

    // Add liquidity
    public fun add_liquidity<X, Y>(
        pool: &mut Pool<X, Y>,
        coin_x: Coin<X>,
        coin_y: Coin<Y>,
        _ctx: &mut TxContext
    ) {
        let amount_x = coin::value(&coin_x);
        let amount_y = coin::value(&coin_y);

        assert!(amount_x > 0 && amount_y > 0, EInvalidAmount);

        let balance_x = coin::into_balance(coin_x);
        let balance_y = coin::into_balance(coin_y);

        balance::join(&mut pool.balance_x, balance_x);
        balance::join(&mut pool.balance_y, balance_y);
    }

    // Simple swap (X -> Y)
    public fun swap_x_to_y<X, Y>(
        pool: &mut Pool<X, Y>,
        coin_x: Coin<X>,
        ctx: &mut TxContext
    ): Coin<Y> {
        let amount_in = coin::value(&coin_x);
        assert!(amount_in > 0, EInvalidAmount);

        let balance_x_amount = balance::value(&pool.balance_x);
        let balance_y_amount = balance::value(&pool.balance_y);

        assert!(balance_x_amount > 0 && balance_y_amount > 0, EInsufficientBalance);

        // Simple constant product calculation
        let fee = (amount_in * pool.fee_percentage) / 10000;
        let amount_in_after_fee = amount_in - fee;

        // k = x * y, amount_out = y - (k / (x + amount_in))
        let k = balance_x_amount * balance_y_amount;
        let new_x = balance_x_amount + amount_in_after_fee;
        let new_y = k / new_x;
        let amount_out = balance_y_amount - new_y;

        // Add input to pool
        let input_balance = coin::into_balance(coin_x);
        balance::join(&mut pool.balance_x, input_balance);

        // Extract output from pool
        let output_balance = balance::split(&mut pool.balance_y, amount_out);
        let output_coin = coin::from_balance(output_balance, ctx);

        event::emit(SwapExecuted {
            pool_id: object::uid_to_address(&pool.id),
            amount_in,
            amount_out,
        });

        output_coin
    }

    // Test function for validation
    public fun get_pool_balances<X, Y>(pool: &Pool<X, Y>): (u64, u64) {
        (
            balance::value(&pool.balance_x),
            balance::value(&pool.balance_y)
        )
    }
}