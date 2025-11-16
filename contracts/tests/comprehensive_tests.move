/// Comprehensive Test Suite for IOTA DeFi Protocol
///
/// This test suite provides extensive coverage for:
/// - DeFi Protocol Core Functionality
/// - NFT Marketplace Operations
/// - Security and Edge Cases
/// - Performance and Gas Optimization
/// - Integration Scenarios

#[test_only]
module iota_defi_protocol::comprehensive_tests {
    use sui::test_scenario::{Self, Scenario};
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::balance;
    use sui::clock::{Self, Clock};
    use sui::test_utils;
    use sui::tx_context;
    use std::string;
    use std::option;
    use std::vector;

    use iota_defi_protocol::defi_protocol::{
        Self,
        ProtocolState,
        LiquidityPool,
        YieldStake,
        GovernanceProposal,
        DFI,
        YLD,
        STBL,
        UTL,
        LPToken
    };

    use iota_defi_protocol::nft_marketplace::{
        Self,
        Marketplace,
        DynamicNFT,
        NFTCollection,
        FixedListing,
        AuctionListing,
        FractionalOwnership,
        NFTFraction,
        DutchAuction,
        RentalListing,
        NFTStake
    };

    use iota_defi_protocol::oracle_aggregator::{
        Self,
        OracleAggregator,
        AggregatedPrice
    };

    // ===== Test Constants =====

    const ADMIN: address = @0xADMIN;
    const USER1: address = @0x1111;
    const USER2: address = @0x2222;
    const USER3: address = @0x3333;

    const INITIAL_BALANCE: u64 = 1000_000_000_000; // 1000 tokens
    const LIQUIDITY_AMOUNT: u64 = 100_000_000_000;  // 100 tokens
    const SWAP_AMOUNT: u64 = 10_000_000_000;        // 10 tokens

    // ===== DeFi Protocol Tests =====

    #[test]
    fun test_protocol_initialization() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        // Initialize protocol
        test_scenario::next_tx(scenario_mut, ADMIN);
        {
            defi_protocol::init_for_testing(test_scenario::ctx(scenario_mut));
        };

        // Verify protocol state
        test_scenario::next_tx(scenario_mut, ADMIN);
        {
            let protocol = test_scenario::take_shared<ProtocolState>(scenario_mut);
            let (version, tvl, fee_rate, paused) = defi_protocol::get_protocol_stats(&protocol);

            assert!(version == 1, 0);
            assert!(tvl == 0, 1);
            assert!(fee_rate == 30, 2); // 0.3%
            assert!(!paused, 3);

            test_scenario::return_shared(protocol);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_token_creation() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        // Initialize protocol
        test_scenario::next_tx(scenario_mut, ADMIN);
        {
            defi_protocol::init_for_testing(test_scenario::ctx(scenario_mut));
        };

        // Check treasury capabilities were created
        test_scenario::next_tx(scenario_mut, ADMIN);
        {
            assert!(test_scenario::has_most_recent_for_sender<TreasuryCap<DFI>>(scenario_mut), 4);
            assert!(test_scenario::has_most_recent_for_sender<TreasuryCap<YLD>>(scenario_mut), 5);
            assert!(test_scenario::has_most_recent_for_sender<TreasuryCap<STBL>>(scenario_mut), 6);
            assert!(test_scenario::has_most_recent_for_sender<TreasuryCap<UTL>>(scenario_mut), 7);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_liquidity_pool_creation() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_protocol_with_tokens(scenario_mut);

        // Create liquidity pool
        test_scenario::next_tx(scenario_mut, ADMIN);
        {
            let protocol = test_scenario::take_shared<ProtocolState>(scenario_mut);
            let dfi_treasury = test_scenario::take_from_sender<TreasuryCap<DFI>>(scenario_mut);
            let utl_treasury = test_scenario::take_from_sender<TreasuryCap<UTL>>(scenario_mut);

            // Mint tokens for liquidity
            let dfi_coins = coin::mint(&mut dfi_treasury, LIQUIDITY_AMOUNT, test_scenario::ctx(scenario_mut));
            let utl_coins = coin::mint(&mut utl_treasury, LIQUIDITY_AMOUNT, test_scenario::ctx(scenario_mut));

            defi_protocol::create_liquidity_pool<DFI, UTL>(
                &mut protocol,
                dfi_coins,
                utl_coins,
                false, // Not stable pool
                100,   // Amplification
                test_scenario::ctx(scenario_mut)
            );

            test_scenario::return_shared(protocol);
            test_scenario::return_to_sender(scenario_mut, dfi_treasury);
            test_scenario::return_to_sender(scenario_mut, utl_treasury);
        };

        // Verify pool was created
        test_scenario::next_tx(scenario_mut, ADMIN);
        {
            assert!(test_scenario::has_most_recent_shared<LiquidityPool<DFI, UTL>>(), 8);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_add_liquidity() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_protocol_with_liquidity_pool(scenario_mut);

        // Add more liquidity
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let pool = test_scenario::take_shared<LiquidityPool<DFI, UTL>>(scenario_mut);
            let protocol = test_scenario::take_shared<ProtocolState>(scenario_mut);
            let lp_treasury = test_scenario::take_from_address<TreasuryCap<LPToken<DFI, UTL>>>(scenario_mut, ADMIN);

            // Create tokens for user
            let dfi_treasury = test_scenario::take_from_address<TreasuryCap<DFI>>(scenario_mut, ADMIN);
            let utl_treasury = test_scenario::take_from_address<TreasuryCap<UTL>>(scenario_mut, ADMIN);

            let dfi_coins = coin::mint(&mut dfi_treasury, 50_000_000_000, test_scenario::ctx(scenario_mut));
            let utl_coins = coin::mint(&mut utl_treasury, 50_000_000_000, test_scenario::ctx(scenario_mut));

            defi_protocol::add_liquidity<DFI, UTL>(
                &mut pool,
                &mut protocol,
                &mut lp_treasury,
                dfi_coins,
                utl_coins,
                1, // Min LP tokens
                test_scenario::ctx(scenario_mut)
            );

            test_scenario::return_shared(pool);
            test_scenario::return_shared(protocol);
            test_scenario::return_to_address(lp_treasury, ADMIN);
            test_scenario::return_to_address(dfi_treasury, ADMIN);
            test_scenario::return_to_address(utl_treasury, ADMIN);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_token_swap() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_protocol_with_liquidity_pool(scenario_mut);

        // Perform token swap
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let pool = test_scenario::take_shared<LiquidityPool<DFI, UTL>>(scenario_mut);
            let protocol = test_scenario::take_shared<ProtocolState>(scenario_mut);

            // Get pool info before swap
            let (reserve_a_before, reserve_b_before, _, _, _) = defi_protocol::get_pool_info(&pool);

            // Create tokens for swap
            let dfi_treasury = test_scenario::take_from_address<TreasuryCap<DFI>>(scenario_mut, ADMIN);
            let swap_tokens = coin::mint(&mut dfi_treasury, SWAP_AMOUNT, test_scenario::ctx(scenario_mut));

            defi_protocol::swap_exact_input<DFI, UTL>(
                &mut pool,
                &mut protocol,
                swap_tokens,
                1, // Min amount out
                test_scenario::ctx(scenario_mut)
            );

            // Verify reserves changed
            let (reserve_a_after, reserve_b_after, _, _, _) = defi_protocol::get_pool_info(&pool);
            assert!(reserve_a_after > reserve_a_before, 9);
            assert!(reserve_b_after < reserve_b_before, 10);

            test_scenario::return_shared(pool);
            test_scenario::return_shared(protocol);
            test_scenario::return_to_address(dfi_treasury, ADMIN);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_yield_farming() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_protocol_with_tokens(scenario_mut);

        // Start yield farming
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let protocol = test_scenario::take_shared<ProtocolState>(scenario_mut);
            let dfi_treasury = test_scenario::take_from_address<TreasuryCap<DFI>>(scenario_mut, ADMIN);

            let stake_tokens = coin::mint(&mut dfi_treasury, 100_000_000_000, test_scenario::ctx(scenario_mut));

            defi_protocol::start_yield_farming<DFI>(
                &mut protocol,
                stake_tokens,
                90, // 90 days lock
                true, // Enable compound
                test_scenario::ctx(scenario_mut)
            );

            test_scenario::return_shared(protocol);
            test_scenario::return_to_address(dfi_treasury, ADMIN);
        };

        // Verify stake was created
        test_scenario::next_tx(scenario_mut, USER1);
        {
            assert!(test_scenario::has_most_recent_for_sender<YieldStake>(scenario_mut), 11);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_governance_proposal() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_protocol_with_tokens(scenario_mut);

        // Create governance proposal
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let protocol = test_scenario::take_shared<ProtocolState>(scenario_mut);
            let clock = clock::create_for_testing(test_scenario::ctx(scenario_mut));
            let dfi_treasury = test_scenario::take_from_address<TreasuryCap<DFI>>(scenario_mut, ADMIN);

            // Mint enough DFI tokens for governance threshold
            let gov_tokens = coin::mint(&mut dfi_treasury, 100_000_000_000, test_scenario::ctx(scenario_mut));

            defi_protocol::create_proposal(
                &mut protocol,
                &gov_tokens,
                b"Test Proposal",
                b"A test governance proposal",
                1, // Parameter change
                b"execution_data",
                &clock,
                test_scenario::ctx(scenario_mut)
            );

            coin::destroy_zero(gov_tokens);
            clock::destroy_for_testing(clock);
            test_scenario::return_shared(protocol);
            test_scenario::return_to_address(dfi_treasury, ADMIN);
        };

        // Verify proposal was created
        test_scenario::next_tx(scenario_mut, USER1);
        {
            assert!(test_scenario::has_most_recent_shared<GovernanceProposal>(), 12);
        };

        test_scenario::end(scenario);
    }

    // ===== NFT Marketplace Tests =====

    #[test]
    fun test_nft_marketplace_init() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        // Initialize marketplace
        test_scenario::next_tx(scenario_mut, ADMIN);
        {
            nft_marketplace::init_for_testing(test_scenario::ctx(scenario_mut));
        };

        // Verify marketplace state
        test_scenario::next_tx(scenario_mut, ADMIN);
        {
            let marketplace = test_scenario::take_shared<Marketplace>(scenario_mut);
            let (total_volume, total_nfts, fee, paused) = nft_marketplace::get_marketplace_stats(&marketplace);

            assert!(total_volume == 0, 13);
            assert!(total_nfts == 0, 14);
            assert!(fee == 250, 15); // 2.5%
            assert!(!paused, 16);

            test_scenario::return_shared(marketplace);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_nft_minting() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_nft_marketplace(scenario_mut);

        // Mint NFT
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let marketplace = test_scenario::take_shared<Marketplace>(scenario_mut);
            let clock = clock::create_for_testing(test_scenario::ctx(scenario_mut));

            nft_marketplace::mint_dynamic_nft(
                &mut marketplace,
                b"Test NFT",
                b"A test NFT",
                b"https://example.com/image.png",
                3, // Rare
                vector::empty(), // Attributes
                500, // 5% royalty
                option::none(), // No collection
                &clock,
                test_scenario::ctx(scenario_mut)
            );

            clock::destroy_for_testing(clock);
            test_scenario::return_shared(marketplace);
        };

        // Verify NFT was minted
        test_scenario::next_tx(scenario_mut, USER1);
        {
            assert!(test_scenario::has_most_recent_for_sender<DynamicNFT>(scenario_mut), 17);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_nft_experience_system() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_nft_marketplace_with_nft(scenario_mut);

        // Grant experience to NFT
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let nft = test_scenario::take_from_sender<DynamicNFT>(scenario_mut);
            let marketplace = test_scenario::take_shared<Marketplace>(scenario_mut);
            let clock = clock::create_for_testing(test_scenario::ctx(scenario_mut));

            nft_marketplace::grant_experience(
                &mut nft,
                &marketplace,
                b"trading",
                100, // Base XP
                &clock,
                test_scenario::ctx(scenario_mut)
            );

            clock::destroy_for_testing(clock);
            test_scenario::return_to_sender(scenario_mut, nft);
            test_scenario::return_shared(marketplace);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_nft_fixed_price_listing() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_nft_marketplace_with_nft(scenario_mut);

        // List NFT for sale
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let nft = test_scenario::take_from_sender<DynamicNFT>(scenario_mut);
            let marketplace = test_scenario::take_shared<Marketplace>(scenario_mut);
            let clock = clock::create_for_testing(test_scenario::ctx(scenario_mut));

            nft_marketplace::list_nft_fixed_price(
                &mut nft,
                &mut marketplace,
                5_000_000_000, // 5 UTL
                option::some(24), // Expires in 24 hours
                option::none(), // Not reserved
                &clock,
                test_scenario::ctx(scenario_mut)
            );

            clock::destroy_for_testing(clock);
            test_scenario::return_to_sender(scenario_mut, nft);
            test_scenario::return_shared(marketplace);
        };

        // Verify listing was created
        test_scenario::next_tx(scenario_mut, USER1);
        {
            assert!(test_scenario::has_most_recent_shared<FixedListing>(), 18);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_nft_auction_creation() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_nft_marketplace_with_nft(scenario_mut);

        // Create auction
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let nft = test_scenario::take_from_sender<DynamicNFT>(scenario_mut);
            let marketplace = test_scenario::take_shared<Marketplace>(scenario_mut);
            let clock = clock::create_for_testing(test_scenario::ctx(scenario_mut));

            nft_marketplace::create_auction(
                &mut nft,
                &mut marketplace,
                1_000_000_000, // 1 UTL starting price
                5_000_000_000, // 5 UTL reserve price
                24, // 24 hours
                100_000_000, // 0.1 UTL min increment
                &clock,
                test_scenario::ctx(scenario_mut)
            );

            clock::destroy_for_testing(clock);
            test_scenario::return_to_sender(scenario_mut, nft);
            test_scenario::return_shared(marketplace);
        };

        // Verify auction was created
        test_scenario::next_tx(scenario_mut, USER1);
        {
            assert!(test_scenario::has_most_recent_shared<AuctionListing>(), 19);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_fractional_ownership() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_nft_marketplace_with_nft(scenario_mut);

        // Enable fractional ownership
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let nft = test_scenario::take_from_sender<DynamicNFT>(scenario_mut);

            nft_marketplace::enable_fractional_ownership(
                &mut nft,
                1000, // Total shares
                1_000_000, // Share price (0.001 UTL)
                100, // Governance threshold
                6000, // 60% sale threshold
                test_scenario::ctx(scenario_mut)
            );

            test_scenario::return_to_sender(scenario_mut, nft);
        };

        // Verify fractional ownership was created
        test_scenario::next_tx(scenario_mut, USER1);
        {
            assert!(test_scenario::has_most_recent_shared<FractionalOwnership>(), 20);
        };

        test_scenario::end(scenario);
    }

    // ===== Security and Edge Case Tests =====

    #[test]
    #[expected_failure(abort_code = defi_protocol::ENotAuthorized)]
    fun test_unauthorized_admin_function() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_protocol_with_tokens(scenario_mut);

        // Try to update parameters as non-admin
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let protocol = test_scenario::take_shared<ProtocolState>(scenario_mut);

            defi_protocol::update_protocol_parameters(
                &mut protocol,
                option::some(500), // New fee
                option::none(),
                test_scenario::ctx(scenario_mut)
            );

            test_scenario::return_shared(protocol);
        };

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = defi_protocol::EInsufficientBalance)]
    fun test_insufficient_balance_swap() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_protocol_with_liquidity_pool(scenario_mut);

        // Try to swap with zero tokens
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let pool = test_scenario::take_shared<LiquidityPool<DFI, UTL>>(scenario_mut);
            let protocol = test_scenario::take_shared<ProtocolState>(scenario_mut);

            let empty_coin = coin::zero<DFI>(test_scenario::ctx(scenario_mut));

            defi_protocol::swap_exact_input<DFI, UTL>(
                &mut pool,
                &mut protocol,
                empty_coin,
                1,
                test_scenario::ctx(scenario_mut)
            );

            test_scenario::return_shared(pool);
            test_scenario::return_shared(protocol);
        };

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = nft_marketplace::ENotOwner)]
    fun test_unauthorized_nft_listing() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_nft_marketplace_with_nft(scenario_mut);

        // Try to list NFT as non-owner
        test_scenario::next_tx(scenario_mut, USER2);
        {
            let nft = test_scenario::take_from_address<DynamicNFT>(scenario_mut, USER1);
            let marketplace = test_scenario::take_shared<Marketplace>(scenario_mut);
            let clock = clock::create_for_testing(test_scenario::ctx(scenario_mut));

            nft_marketplace::list_nft_fixed_price(
                &mut nft,
                &mut marketplace,
                5_000_000_000,
                option::none(),
                option::none(),
                &clock,
                test_scenario::ctx(scenario_mut)
            );

            clock::destroy_for_testing(clock);
            test_scenario::return_to_address(nft, USER1);
            test_scenario::return_shared(marketplace);
        };

        test_scenario::end(scenario);
    }

    // ===== Integration Tests =====

    #[test]
    fun test_defi_nft_integration() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        // Setup both protocols
        setup_protocol_with_tokens(scenario_mut);
        setup_nft_marketplace(scenario_mut);

        // Mint UTL tokens for NFT purchases
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let utl_treasury = test_scenario::take_from_address<TreasuryCap<UTL>>(scenario_mut, ADMIN);
            let utl_coins = coin::mint(&mut utl_treasury, 10_000_000_000, test_scenario::ctx(scenario_mut));
            transfer::public_transfer(utl_coins, USER1);
            test_scenario::return_to_address(utl_treasury, ADMIN);
        };

        // Mint NFT
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let marketplace = test_scenario::take_shared<Marketplace>(scenario_mut);
            let clock = clock::create_for_testing(test_scenario::ctx(scenario_mut));

            nft_marketplace::mint_dynamic_nft(
                &mut marketplace,
                b"DeFi NFT",
                b"NFT integrated with DeFi",
                b"https://example.com/defi.png",
                4, // Epic rarity
                vector::empty(),
                300, // 3% royalty
                option::none(),
                &clock,
                test_scenario::ctx(scenario_mut)
            );

            clock::destroy_for_testing(clock);
            test_scenario::return_shared(marketplace);
        };

        // Use UTL tokens to purchase fractional shares
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let nft = test_scenario::take_from_sender<DynamicNFT>(scenario_mut);

            nft_marketplace::enable_fractional_ownership(
                &mut nft,
                1000,
                10_000_000, // 0.01 UTL per share
                50,
                5000,
                test_scenario::ctx(scenario_mut)
            );

            test_scenario::return_to_sender(scenario_mut, nft);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_performance_high_volume_swaps() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_protocol_with_liquidity_pool(scenario_mut);

        // Perform multiple swaps to test gas efficiency
        let i = 0;
        while (i < 5) {
            test_scenario::next_tx(scenario_mut, USER1);
            {
                let pool = test_scenario::take_shared<LiquidityPool<DFI, UTL>>(scenario_mut);
                let protocol = test_scenario::take_shared<ProtocolState>(scenario_mut);
                let dfi_treasury = test_scenario::take_from_address<TreasuryCap<DFI>>(scenario_mut, ADMIN);

                let swap_tokens = coin::mint(&mut dfi_treasury, 1_000_000_000, test_scenario::ctx(scenario_mut));

                defi_protocol::swap_exact_input<DFI, UTL>(
                    &mut pool,
                    &mut protocol,
                    swap_tokens,
                    1,
                    test_scenario::ctx(scenario_mut)
                );

                test_scenario::return_shared(pool);
                test_scenario::return_shared(protocol);
                test_scenario::return_to_address(dfi_treasury, ADMIN);
            };

            i = i + 1;
        };

        test_scenario::end(scenario);
    }

    // ===== Oracle Aggregator Tests =====

    #[test]
    fun test_oracle_aggregator_init() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        // Initialize oracle aggregator
        test_scenario::next_tx(scenario_mut, ADMIN);
        {
            oracle_aggregator::init_for_testing(test_scenario::ctx(scenario_mut));
        };

        // Verify aggregator was created
        test_scenario::next_tx(scenario_mut, ADMIN);
        {
            assert!(test_scenario::has_most_recent_shared<OracleAggregator>(), 21);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_oracle_node_registration() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_oracle_aggregator(scenario_mut);

        // Register oracle node
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let aggregator = test_scenario::take_shared<OracleAggregator>(scenario_mut);

            oracle_aggregator::register_oracle_node(
                &mut aggregator,
                1_000_000_000, // 1 token stake
                test_scenario::ctx(scenario_mut)
            );

            test_scenario::return_shared(aggregator);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_price_feed_management() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_oracle_aggregator(scenario_mut);

        // Add price feed
        test_scenario::next_tx(scenario_mut, ADMIN);
        {
            let aggregator = test_scenario::take_shared<OracleAggregator>(scenario_mut);

            oracle_aggregator::add_price_feed(
                &mut aggregator,
                b"DFI/UTL",
                test_scenario::ctx(scenario_mut)
            );

            test_scenario::return_shared(aggregator);
        };

        test_scenario::end(scenario);
    }

    // ===== Advanced NFT Tests =====

    #[test]
    fun test_dutch_auction() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_nft_marketplace_with_nft(scenario_mut);

        // Create Dutch auction
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let nft = test_scenario::take_from_sender<DynamicNFT>(scenario_mut);
            let clock = clock::create_for_testing(test_scenario::ctx(scenario_mut));

            nft_marketplace::create_dutch_auction(
                &mut nft,
                10_000_000_000, // 10 UTL start
                2_000_000_000,  // 2 UTL end
                12,              // 12 hours
                &clock,
                test_scenario::ctx(scenario_mut)
            );

            clock::destroy_for_testing(clock);
            test_scenario::return_to_sender(scenario_mut, nft);
        };

        // Verify Dutch auction was created
        test_scenario::next_tx(scenario_mut, USER1);
        {
            assert!(test_scenario::has_most_recent_shared<DutchAuction>(), 22);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_nft_staking() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_nft_marketplace_with_nft(scenario_mut);

        // Stake NFT
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let nft = test_scenario::take_from_sender<DynamicNFT>(scenario_mut);
            let clock = clock::create_for_testing(test_scenario::ctx(scenario_mut));

            nft_marketplace::stake_nft(
                &mut nft,
                30, // 30 days
                true, // Enable compound
                &clock,
                test_scenario::ctx(scenario_mut)
            );

            clock::destroy_for_testing(clock);
            test_scenario::return_to_sender(scenario_mut, nft);
        };

        // Verify stake was created
        test_scenario::next_tx(scenario_mut, USER1);
        {
            assert!(test_scenario::has_most_recent_for_sender<NFTStake>(scenario_mut), 23);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_batch_operations() {
        let scenario = test_scenario::begin(ADMIN);
        let scenario_mut = &mut scenario;

        setup_protocol_with_liquidity_pool(scenario_mut);

        // Test batch swaps
        test_scenario::next_tx(scenario_mut, USER1);
        {
            let pool = test_scenario::take_shared<LiquidityPool<DFI, UTL>>(scenario_mut);
            let protocol = test_scenario::take_shared<ProtocolState>(scenario_mut);
            let dfi_treasury = test_scenario::take_from_address<TreasuryCap<DFI>>(scenario_mut, ADMIN);

            // Create multiple tokens for batch swap
            let tokens = vector::empty<Coin<DFI>>();
            let min_amounts = vector::empty<u64>();

            let i = 0;
            while (i < 3) {
                let token = coin::mint(&mut dfi_treasury, 1_000_000_000, test_scenario::ctx(scenario_mut));
                vector::push_back(&mut tokens, token);
                vector::push_back(&mut min_amounts, 1);
                i = i + 1;
            };

            defi_protocol::batch_swaps<DFI, UTL>(
                &mut pool,
                &mut protocol,
                tokens,
                min_amounts,
                test_scenario::ctx(scenario_mut)
            );

            test_scenario::return_shared(pool);
            test_scenario::return_shared(protocol);
            test_scenario::return_to_address(dfi_treasury, ADMIN);
        };

        test_scenario::end(scenario);
    }

    // ===== Helper Functions =====

    fun setup_protocol_with_tokens(scenario: &mut Scenario) {
        test_scenario::next_tx(scenario, ADMIN);
        {
            defi_protocol::init_for_testing(test_scenario::ctx(scenario));
        };
    }

    fun setup_protocol_with_liquidity_pool(scenario: &mut Scenario) {
        setup_protocol_with_tokens(scenario);

        test_scenario::next_tx(scenario, ADMIN);
        {
            let protocol = test_scenario::take_shared<ProtocolState>(scenario);
            let dfi_treasury = test_scenario::take_from_sender<TreasuryCap<DFI>>(scenario);
            let utl_treasury = test_scenario::take_from_sender<TreasuryCap<UTL>>(scenario);

            let dfi_coins = coin::mint(&mut dfi_treasury, LIQUIDITY_AMOUNT, test_scenario::ctx(scenario));
            let utl_coins = coin::mint(&mut utl_treasury, LIQUIDITY_AMOUNT, test_scenario::ctx(scenario));

            defi_protocol::create_liquidity_pool<DFI, UTL>(
                &mut protocol,
                dfi_coins,
                utl_coins,
                false,
                100,
                test_scenario::ctx(scenario)
            );

            test_scenario::return_shared(protocol);
            test_scenario::return_to_sender(scenario, dfi_treasury);
            test_scenario::return_to_sender(scenario, utl_treasury);
        };
    }

    fun setup_nft_marketplace(scenario: &mut Scenario) {
        test_scenario::next_tx(scenario, ADMIN);
        {
            nft_marketplace::init_for_testing(test_scenario::ctx(scenario));
        };
    }

    fun setup_nft_marketplace_with_nft(scenario: &mut Scenario) {
        setup_nft_marketplace(scenario);

        test_scenario::next_tx(scenario, USER1);
        {
            let marketplace = test_scenario::take_shared<Marketplace>(scenario);
            let clock = clock::create_for_testing(test_scenario::ctx(scenario));

            nft_marketplace::mint_dynamic_nft(
                &mut marketplace,
                b"Test NFT",
                b"Test Description",
                b"https://example.com/test.png",
                3, // Rare
                vector::empty(),
                500, // 5% royalty
                option::none(),
                &clock,
                test_scenario::ctx(scenario)
            );

            clock::destroy_for_testing(clock);
            test_scenario::return_shared(marketplace);
        };
    }

    fun setup_oracle_aggregator(scenario: &mut Scenario) {
        test_scenario::next_tx(scenario, ADMIN);
        {
            oracle_aggregator::init_for_testing(test_scenario::ctx(scenario));
        };
    }

    fun setup_oracle_with_price_feed(scenario: &mut Scenario) {
        setup_oracle_aggregator(scenario);

        test_scenario::next_tx(scenario, ADMIN);
        {
            let aggregator = test_scenario::take_shared<OracleAggregator>(scenario);

            oracle_aggregator::add_price_feed(
                &mut aggregator,
                b"DFI/UTL",
                test_scenario::ctx(scenario)
            );

            test_scenario::return_shared(aggregator);
        };
    }
}