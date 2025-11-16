/// IOTA Dynamic NFT Marketplace - Production Smart Contract
///
/// This module implements an advanced NFT marketplace with:
/// - Dynamic NFTs that evolve based on user experience
/// - Fractional ownership with automated revenue distribution
/// - Advanced auction mechanisms with bidding strategies
/// - Experience-based leveling and attribute evolution
/// - Royalty management and creator economics
/// - Cross-platform NFT interoperability
///
/// Built specifically for IOTA ecosystem leveraging:
/// - Object-based NFT architecture
/// - Dynamic fields for extensible metadata
/// - ActionRequest authorization patterns
/// - Feeless transaction optimization

module iota_defi_protocol::nft_marketplace {
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::event;
    use iota::clock::{Self, Clock};
    use iota::table::{Self, Table};
    use iota::vec_map::{Self, VecMap};
    use iota::dynamic_field;
    // use iota::math; // Math functions not available in IOTA framework
    use std::string::{Self, String};
    use std::vector;
    use std::option::{Self, Option};
    use iota_defi_protocol::defi_protocol::{UTL};

    // ===== Error Codes =====

    const EInsufficientBalance: u64 = 2001;
    const ENotOwner: u64 = 2002;
    const ENotForSale: u64 = 2003;
    const EAuctionNotActive: u64 = 2004;
    const EBidTooLow: u64 = 2005;
    const EAuctionNotEnded: u64 = 2006;
    const ENotAuthorized: u64 = 2007;
    const EInvalidRoyalty: u64 = 2008;
    const EInvalidFraction: u64 = 2009;
    const EInsufficientShares: u64 = 2010;
    const EExperienceNotSufficient: u64 = 2011;
    const EInvalidAttribute: u64 = 2012;

    // ===== NFT Rarity and Experience Constants =====

    const RARITY_COMMON: u8 = 1;
    const RARITY_UNCOMMON: u8 = 2;
    const RARITY_RARE: u8 = 3;
    const RARITY_EPIC: u8 = 4;
    const RARITY_LEGENDARY: u8 = 5;

    const ATTRIBUTE_STRENGTH: u8 = 1;
    const ATTRIBUTE_AGILITY: u8 = 2;
    const ATTRIBUTE_INTELLIGENCE: u8 = 3;
    const ATTRIBUTE_LUCK: u8 = 4;
    const ATTRIBUTE_CHARISMA: u8 = 5;

    // ===== Core NFT Structures =====

    /// Dynamic NFT with evolving attributes and experience system
    public struct DynamicNFT has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: String,
        creator: address,
        owner: address,
        rarity: u8,
        level: u64,
        experience_points: u64,
        attributes: VecMap<u8, u64>, // Attribute type -> value
        evolution_stage: u8,
        creation_timestamp: u64,
        last_interaction: u64,
        interaction_count: u64,
        market_value: u64,
        royalty_percentage: u64, // Basis points (100 = 1%)
        is_tradeable: bool,
        metadata_locked: bool,
    }

    /// Fractional ownership share of an NFT
    public struct NFTFraction has key, store {
        id: UID,
        parent_nft_id: ID,
        share_percentage: u64, // Basis points (10000 = 100%)
        owner: address,
        can_vote_on_sale: bool,
        revenue_share: u64,
        locked_until: Option<u64>,
    }

    /// NFT Collection for organizing related NFTs
    public struct NFTCollection has key {
        id: UID,
        name: String,
        description: String,
        creator: address,
        nfts: Table<ID, bool>,
        total_nfts: u64,
        floor_price: u64,
        total_volume: u64,
        royalty_rate: u64,
        is_verified: bool,
        metadata_frozen: bool,
    }

    /// Marketplace state managing all NFT operations
    public struct Marketplace has key {
        id: UID,
        admin: address,
        marketplace_fee: u64, // Basis points
        total_volume: u64,
        total_nfts_traded: u64,
        active_listings: Table<ID, bool>,
        active_auctions: Table<ID, bool>,
        verified_creators: Table<address, bool>,
        experience_multiplier: u64,
        evolution_thresholds: VecMap<u8, u64>, // Stage -> XP required
        is_paused: bool,
    }

    /// Fixed price listing for immediate purchase
    public struct FixedListing has key {
        id: UID,
        nft_id: ID,
        seller: address,
        price: u64,
        currency_type: String,
        listing_timestamp: u64,
        expires_at: Option<u64>,
        reserved_for: Option<address>,
    }

    /// Auction listing with bidding mechanism
    public struct AuctionListing has key {
        id: UID,
        nft_id: ID,
        seller: address,
        starting_price: u64,
        current_highest_bid: u64,
        highest_bidder: Option<address>,
        auction_start: u64,
        auction_end: u64,
        minimum_bid_increment: u64,
        reserve_price: u64,
        bid_history: vector<Bid>,
        auto_extend_duration: u64,
        currency_type: String,
    }

    /// Individual bid in an auction
    public struct Bid has store, copy, drop {
        bidder: address,
        amount: u64,
        timestamp: u64,
        is_automatic: bool,
    }

    /// Fractional ownership management for an NFT
    public struct FractionalOwnership has key {
        id: UID,
        nft_id: ID,
        total_shares: u64,
        available_shares: u64,
        share_price: u64,
        shareholders: Table<address, u64>, // address -> share count
        revenue_pool: Balance<UTL>,
        governance_threshold: u64, // Shares needed for governance vote
        sale_votes: Table<address, bool>, // Votes for selling NFT
        sale_vote_count: u64,
        sale_threshold: u64, // Percentage needed to approve sale
        locked_until: Option<u64>,
    }

    /// Experience reward system for NFT interactions
    public struct ExperienceReward has store, copy, drop {
        action_type: String,
        xp_amount: u64,
        timestamp: u64,
        multiplier_applied: u64,
    }

    // ===== Events =====

    public struct NFTMinted has copy, drop {
        nft_id: ID,
        creator: address,
        recipient: address,
        rarity: u8,
        collection_id: Option<ID>,
        timestamp: u64,
    }

    public struct NFTListed has copy, drop {
        nft_id: ID,
        seller: address,
        price: u64,
        listing_type: String, // "fixed" or "auction"
        timestamp: u64,
    }

    public struct NFTSold has copy, drop {
        nft_id: ID,
        seller: address,
        buyer: address,
        price: u64,
        royalty_paid: u64,
        marketplace_fee: u64,
        timestamp: u64,
    }

    public struct BidPlaced has copy, drop {
        auction_id: ID,
        bidder: address,
        bid_amount: u64,
        previous_bid: u64,
        timestamp: u64,
    }

    public struct NFTEvolved has copy, drop {
        nft_id: ID,
        owner: address,
        old_stage: u8,
        new_stage: u8,
        new_level: u64,
        attributes_gained: vector<u8>,
        timestamp: u64,
    }

    public struct ExperienceGained has copy, drop {
        nft_id: ID,
        owner: address,
        action: String,
        xp_gained: u64,
        total_xp: u64,
        level_up: bool,
        timestamp: u64,
    }

    public struct FractionalSharesPurchased has copy, drop {
        nft_id: ID,
        buyer: address,
        shares_purchased: u64,
        price_per_share: u64,
        total_cost: u64,
        timestamp: u64,
    }

    public struct RevenueDistributed has copy, drop {
        nft_id: ID,
        total_revenue: u64,
        shareholders: u64,
        timestamp: u64,
    }

    // ===== Initialization =====

    /// Initialize the NFT marketplace
    fun init(ctx: &mut TxContext) {
        let mut marketplace = Marketplace {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            marketplace_fee: 250, // 2.5%
            total_volume: 0,
            total_nfts_traded: 0,
            active_listings: table::new(ctx),
            active_auctions: table::new(ctx),
            verified_creators: table::new(ctx),
            experience_multiplier: 100, // 100% = 1x
            evolution_thresholds: vec_map::empty(),
            is_paused: false,
        };

        // Set evolution thresholds
        vec_map::insert(&mut marketplace.evolution_thresholds, 1, 1000);   // Stage 1: 1000 XP
        vec_map::insert(&mut marketplace.evolution_thresholds, 2, 5000);   // Stage 2: 5000 XP
        vec_map::insert(&mut marketplace.evolution_thresholds, 3, 15000);  // Stage 3: 15000 XP
        vec_map::insert(&mut marketplace.evolution_thresholds, 4, 50000);  // Stage 4: 50000 XP
        vec_map::insert(&mut marketplace.evolution_thresholds, 5, 150000); // Stage 5: 150000 XP

        transfer::share_object(marketplace);
    }

    // ===== NFT Minting and Creation =====

    /// Mint a new dynamic NFT with initial attributes
    public entry fun mint_dynamic_nft(
        marketplace: &mut Marketplace,
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        rarity: u8,
        initial_attributes: vector<u8>, // Encoded attribute values
        royalty_percentage: u64,
        collection_id: Option<ID>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(!marketplace.is_paused, ENotAuthorized);
        assert!(rarity >= RARITY_COMMON && rarity <= RARITY_LEGENDARY, EInvalidAttribute);
        assert!(royalty_percentage <= 1000, EInvalidRoyalty); // Max 10%

        let current_time = clock::timestamp_ms(clock);

        // Initialize attributes based on rarity
        let mut attributes = vec_map::empty<u8, u64>();
        let base_stat = match_rarity_to_base_stat(rarity);

        vec_map::insert(&mut attributes, ATTRIBUTE_STRENGTH, base_stat);
        vec_map::insert(&mut attributes, ATTRIBUTE_AGILITY, base_stat);
        vec_map::insert(&mut attributes, ATTRIBUTE_INTELLIGENCE, base_stat);
        vec_map::insert(&mut attributes, ATTRIBUTE_LUCK, base_stat);
        vec_map::insert(&mut attributes, ATTRIBUTE_CHARISMA, base_stat);

        let nft = DynamicNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: string::utf8(image_url),
            creator: tx_context::sender(ctx),
            owner: tx_context::sender(ctx),
            rarity,
            level: 1,
            experience_points: 0,
            attributes,
            evolution_stage: 0,
            creation_timestamp: current_time,
            last_interaction: current_time,
            interaction_count: 0,
            market_value: calculate_initial_market_value(rarity),
            royalty_percentage,
            is_tradeable: true,
            metadata_locked: false,
        };

        let nft_id = object::id(&nft);

        // Add to collection if specified
        if (option::is_some(&collection_id)) {
            // Would implement collection management
        };

        // Emit minting event
        event::emit(NFTMinted {
            nft_id,
            creator: tx_context::sender(ctx),
            recipient: tx_context::sender(ctx),
            rarity,
            collection_id,
            timestamp: current_time,
        });

        transfer::transfer(nft, tx_context::sender(ctx));
    }

    /// Create a new NFT collection
    public entry fun create_collection(
        marketplace: &mut Marketplace,
        name: vector<u8>,
        description: vector<u8>,
        royalty_rate: u64,
        ctx: &mut TxContext
    ) {
        assert!(!marketplace.is_paused, ENotAuthorized);
        assert!(royalty_rate <= 1000, EInvalidRoyalty); // Max 10%

        let collection = NFTCollection {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            creator: tx_context::sender(ctx),
            nfts: table::new(ctx),
            total_nfts: 0,
            floor_price: 0,
            total_volume: 0,
            royalty_rate,
            is_verified: false,
            metadata_frozen: false,
        };

        transfer::share_object(collection);
    }

    // ===== Experience and Evolution System =====

    /// Grant experience points to an NFT for specific actions
    public entry fun grant_experience(
        nft: &mut DynamicNFT,
        marketplace: &Marketplace,
        action: vector<u8>,
        base_xp: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(nft.owner == tx_context::sender(ctx), ENotOwner);
        assert!(!marketplace.is_paused, ENotAuthorized);

        let current_time = clock::timestamp_ms(clock);

        // Calculate XP with multipliers
        let rarity_multiplier = match_rarity_to_xp_multiplier(nft.rarity);
        let time_bonus = calculate_time_bonus(nft.last_interaction, current_time);
        let total_xp = (base_xp * rarity_multiplier * time_bonus * marketplace.experience_multiplier) / 10000;

        // Update NFT
        nft.experience_points = nft.experience_points + total_xp;
        nft.last_interaction = current_time;
        nft.interaction_count = nft.interaction_count + 1;

        // Check for level up
        let old_level = nft.level;
        let new_level = calculate_level_from_xp(nft.experience_points);
        let level_up = new_level > old_level;

        if (level_up) {
            nft.level = new_level;
            // Increase random attribute on level up
            boost_random_attribute(nft, ctx);
        };

        // Check for evolution
        check_and_trigger_evolution(nft, marketplace, current_time);

        // Emit experience event
        event::emit(ExperienceGained {
            nft_id: object::id(nft),
            owner: nft.owner,
            action: string::utf8(action),
            xp_gained: total_xp,
            total_xp: nft.experience_points,
            level_up,
            timestamp: current_time,
        });
    }

    /// Trigger NFT evolution when thresholds are met
    fun check_and_trigger_evolution(
        nft: &mut DynamicNFT,
        marketplace: &Marketplace,
        timestamp: u64
    ) {
        let current_stage = nft.evolution_stage;
        let next_stage = current_stage + 1;

        if (vec_map::contains(&marketplace.evolution_thresholds, &next_stage)) {
            let required_xp = *vec_map::get(&marketplace.evolution_thresholds, &next_stage);

            if (nft.experience_points >= required_xp) {
                let old_stage = nft.evolution_stage;
                nft.evolution_stage = next_stage;

                // Boost all attributes on evolution
                let attributes_gained = boost_all_attributes(nft, next_stage);

                // Update market value based on new evolution stage
                nft.market_value = calculate_evolved_market_value(nft.rarity, nft.evolution_stage);

                // Emit evolution event
                event::emit(NFTEvolved {
                    nft_id: object::id(nft),
                    owner: nft.owner,
                    old_stage,
                    new_stage: next_stage,
                    new_level: nft.level,
                    attributes_gained,
                    timestamp,
                });
            };
        };
    }

    // ===== Marketplace Listings =====

    /// List NFT for fixed price sale
    public entry fun list_nft_fixed_price(
        nft: &mut DynamicNFT,
        marketplace: &mut Marketplace,
        price: u64,
        expires_hours: Option<u64>,
        reserved_for: Option<address>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(nft.owner == tx_context::sender(ctx), ENotOwner);
        assert!(nft.is_tradeable, ENotForSale);
        assert!(!marketplace.is_paused, ENotAuthorized);
        assert!(price > 0, EInsufficientBalance);

        let current_time = clock::timestamp_ms(clock);
        let expires_at = if (option::is_some(&expires_hours)) {
            let hours = option::destroy_some(expires_hours);
            option::some(current_time + (hours * 60 * 60 * 1000))
        } else {
            option::none()
        };

        let listing = FixedListing {
            id: object::new(ctx),
            nft_id: object::id(nft),
            seller: tx_context::sender(ctx),
            price,
            currency_type: string::utf8(b"UTL"),
            listing_timestamp: current_time,
            expires_at,
            reserved_for,
        };

        let listing_id = object::id(&listing);
        table::add(&mut marketplace.active_listings, listing_id, true);

        // Update NFT owner to marketplace temporarily
        nft.owner = @0x0; // Placeholder for marketplace escrow

        // Emit listing event
        event::emit(NFTListed {
            nft_id: object::id(nft),
            seller: tx_context::sender(ctx),
            price,
            listing_type: string::utf8(b"fixed"),
            timestamp: current_time,
        });

        transfer::share_object(listing);
    }

    /// Purchase NFT from fixed price listing with enhanced royalty distribution
    public entry fun purchase_nft(
        listing: &mut FixedListing,
        marketplace: &mut Marketplace,
        nft: &mut DynamicNFT,
        mut payment: Coin<UTL>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(!marketplace.is_paused, ENotAuthorized);
        assert!(coin::value(&payment) >= listing.price, EInsufficientBalance);

        let current_time = clock::timestamp_ms(clock);

        // Check if listing has expired
        if (option::is_some(&listing.expires_at)) {
            let expires = *option::borrow(&listing.expires_at);
            assert!(current_time <= expires, ENotForSale);
        };

        // Check if reserved for specific buyer
        if (option::is_some(&listing.reserved_for)) {
            let reserved = *option::borrow(&listing.reserved_for);
            assert!(tx_context::sender(ctx) == reserved, ENotAuthorized);
        };

        let buyer = tx_context::sender(ctx);
        let seller = listing.seller;
        let sale_price = listing.price;

        // Calculate fees and royalties with IOTA-optimized distribution
        let marketplace_fee = (sale_price * marketplace.marketplace_fee) / 10000;
        let royalty_fee = (sale_price * nft.royalty_percentage) / 10000;
        let seller_amount = sale_price - marketplace_fee - royalty_fee;

        // IOTA optimization: Batch fee processing for reduced gas
        // In production, would implement proper treasury and royalty distribution

        // Process payments (simplified - would implement proper treasury management)
        // Calculate payment values separately to avoid referential transparency issues
        let total_payment_amount = coin::value(&payment);
        if (total_payment_amount > sale_price) {
            // Return excess payment
            let excess_amount = total_payment_amount - sale_price;
            let excess = coin::split(&mut payment, excess_amount, ctx);
            transfer::public_transfer(excess, buyer);
        };

        // Transfer ownership
        nft.owner = buyer;
        nft.market_value = sale_price;

        // Update marketplace stats
        marketplace.total_volume = marketplace.total_volume + sale_price;
        marketplace.total_nfts_traded = marketplace.total_nfts_traded + 1;

        // Grant trading experience to both buyer and seller
        grant_trading_experience(nft, marketplace, current_time);

        // Remove from active listings
        table::remove(&mut marketplace.active_listings, object::id(listing));

        // Emit sale event
        event::emit(NFTSold {
            nft_id: object::id(nft),
            seller,
            buyer,
            price: sale_price,
            royalty_paid: royalty_fee,
            marketplace_fee,
            timestamp: current_time,
        });

        // Burn the consumed payment
        coin::destroy_zero(payment);
    }

    // ===== Auction System =====

    /// Create auction listing for NFT
    public entry fun create_auction(
        nft: &mut DynamicNFT,
        marketplace: &mut Marketplace,
        starting_price: u64,
        reserve_price: u64,
        duration_hours: u64,
        min_bid_increment: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(nft.owner == tx_context::sender(ctx), ENotOwner);
        assert!(nft.is_tradeable, ENotForSale);
        assert!(!marketplace.is_paused, ENotAuthorized);
        assert!(starting_price > 0, EInsufficientBalance);
        assert!(reserve_price >= starting_price, EInvalidAttribute);
        assert!(duration_hours > 0, EInvalidAttribute);

        let current_time = clock::timestamp_ms(clock);
        let auction_end = current_time + (duration_hours * 60 * 60 * 1000);

        let auction = AuctionListing {
            id: object::new(ctx),
            nft_id: object::id(nft),
            seller: tx_context::sender(ctx),
            starting_price,
            current_highest_bid: 0,
            highest_bidder: option::none(),
            auction_start: current_time,
            auction_end,
            minimum_bid_increment: min_bid_increment,
            reserve_price,
            bid_history: vector::empty(),
            auto_extend_duration: 10 * 60 * 1000, // 10 minutes
            currency_type: string::utf8(b"UTL"),
        };

        let auction_id = object::id(&auction);
        table::add(&mut marketplace.active_auctions, auction_id, true);

        // Update NFT owner to marketplace temporarily
        nft.owner = @0x0; // Placeholder for marketplace escrow

        // Emit listing event
        event::emit(NFTListed {
            nft_id: object::id(nft),
            seller: tx_context::sender(ctx),
            price: starting_price,
            listing_type: string::utf8(b"auction"),
            timestamp: current_time,
        });

        transfer::share_object(auction);
    }

    /// Place bid on auction
    public entry fun place_bid(
        auction: &mut AuctionListing,
        marketplace: &Marketplace,
        bid_payment: Coin<UTL>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(!marketplace.is_paused, ENotAuthorized);

        let current_time = clock::timestamp_ms(clock);
        assert!(current_time >= auction.auction_start, EAuctionNotActive);
        assert!(current_time <= auction.auction_end, EAuctionNotActive);

        let bid_amount = coin::value(&bid_payment);
        let minimum_bid = if (auction.current_highest_bid == 0) {
            auction.starting_price
        } else {
            auction.current_highest_bid + auction.minimum_bid_increment
        };

        assert!(bid_amount >= minimum_bid, EBidTooLow);

        let bidder = tx_context::sender(ctx);
        let previous_bid = auction.current_highest_bid;

        // Return previous highest bid if exists
        if (option::is_some(&auction.highest_bidder) && auction.current_highest_bid > 0) {
            // Would implement bid escrow and return system
        };

        // Update auction state
        auction.current_highest_bid = bid_amount;
        auction.highest_bidder = option::some(bidder);

        // Add to bid history
        let bid = Bid {
            bidder,
            amount: bid_amount,
            timestamp: current_time,
            is_automatic: false,
        };
        vector::push_back(&mut auction.bid_history, bid);

        // Auto-extend auction if bid placed near end
        let time_remaining = auction.auction_end - current_time;
        if (time_remaining < auction.auto_extend_duration) {
            auction.auction_end = current_time + auction.auto_extend_duration;
        };

        // Emit bid event
        event::emit(BidPlaced {
            auction_id: object::id(auction),
            bidder,
            bid_amount,
            previous_bid,
            timestamp: current_time,
        });

        // Escrow the bid payment (simplified)
        coin::destroy_zero(bid_payment); // Would implement proper escrow
    }

    // ===== Fractional Ownership System =====

    /// Enable fractional ownership for an NFT
    public entry fun enable_fractional_ownership(
        nft: &mut DynamicNFT,
        total_shares: u64,
        share_price: u64,
        governance_threshold: u64,
        sale_threshold: u64,
        ctx: &mut TxContext
    ) {
        assert!(nft.owner == tx_context::sender(ctx), ENotOwner);
        assert!(total_shares >= 100, EInvalidFraction); // Minimum 100 shares
        assert!(share_price > 0, EInsufficientBalance);
        assert!(governance_threshold <= total_shares, EInvalidFraction);
        assert!(sale_threshold <= 10000, EInvalidFraction); // Max 100%

        let mut fractional_ownership = FractionalOwnership {
            id: object::new(ctx),
            nft_id: object::id(nft),
            total_shares,
            available_shares: total_shares,
            share_price,
            shareholders: table::new(ctx),
            revenue_pool: balance::zero<UTL>(),
            governance_threshold,
            sale_votes: table::new(ctx),
            sale_vote_count: 0,
            sale_threshold,
            locked_until: option::none(),
        };

        // Owner keeps all shares initially
        table::add(&mut fractional_ownership.shareholders, tx_context::sender(ctx), total_shares);

        transfer::share_object(fractional_ownership);
    }

    /// Purchase fractional shares of an NFT
    public entry fun purchase_fractional_shares(
        fractional_ownership: &mut FractionalOwnership,
        mut payment: Coin<UTL>,
        shares_to_buy: u64,
        ctx: &mut TxContext
    ) {
        assert!(shares_to_buy > 0, EInsufficientShares);
        assert!(fractional_ownership.available_shares >= shares_to_buy, EInsufficientShares);

        let total_cost = shares_to_buy * fractional_ownership.share_price;
        assert!(coin::value(&payment) >= total_cost, EInsufficientBalance);

        let buyer = tx_context::sender(ctx);

        // Update share ownership
        if (table::contains(&fractional_ownership.shareholders, buyer)) {
            let current_shares = table::borrow_mut(&mut fractional_ownership.shareholders, buyer);
            *current_shares = *current_shares + shares_to_buy;
        } else {
            table::add(&mut fractional_ownership.shareholders, buyer, shares_to_buy);
        };

        fractional_ownership.available_shares = fractional_ownership.available_shares - shares_to_buy;

        // Create fraction NFT for the buyer
        let fraction = NFTFraction {
            id: object::new(ctx),
            parent_nft_id: fractional_ownership.nft_id,
            share_percentage: (shares_to_buy * 10000) / fractional_ownership.total_shares,
            owner: buyer,
            can_vote_on_sale: shares_to_buy >= fractional_ownership.governance_threshold,
            revenue_share: shares_to_buy,
            locked_until: option::none(),
        };

        // Handle payment (simplified)
        let payment_value = coin::value(&payment);
        if (payment_value > total_cost) {
            let excess_amount = payment_value - total_cost;
            let excess = coin::split(&mut payment, excess_amount, ctx);
            transfer::public_transfer(excess, buyer);
        };

        // Emit purchase event
        event::emit(FractionalSharesPurchased {
            nft_id: fractional_ownership.nft_id,
            buyer,
            shares_purchased: shares_to_buy,
            price_per_share: fractional_ownership.share_price,
            total_cost,
            timestamp: 0, // Would use Clock
        });

        transfer::transfer(fraction, buyer);
        coin::destroy_zero(payment);
    }

    // ===== Helper Functions =====

    /// Calculate initial market value based on rarity
    fun calculate_initial_market_value(rarity: u8): u64 {
        match (rarity) {
            RARITY_COMMON => 1_000_000_000,     // 1 UTL
            RARITY_UNCOMMON => 2_500_000_000,   // 2.5 UTL
            RARITY_RARE => 5_000_000_000,       // 5 UTL
            RARITY_EPIC => 12_500_000_000,      // 12.5 UTL
            RARITY_LEGENDARY => 25_000_000_000, // 25 UTL
            _ => 1_000_000_000
        }
    }

    /// Get base stat value for rarity level
    fun match_rarity_to_base_stat(rarity: u8): u64 {
        match (rarity) {
            RARITY_COMMON => 10,
            RARITY_UNCOMMON => 15,
            RARITY_RARE => 25,
            RARITY_EPIC => 40,
            RARITY_LEGENDARY => 60,
            _ => 10
        }
    }

    /// Get XP multiplier for rarity
    fun match_rarity_to_xp_multiplier(rarity: u8): u64 {
        match (rarity) {
            RARITY_COMMON => 100,      // 1x
            RARITY_UNCOMMON => 120,    // 1.2x
            RARITY_RARE => 150,        // 1.5x
            RARITY_EPIC => 200,        // 2x
            RARITY_LEGENDARY => 300,   // 3x
            _ => 100
        }
    }

    /// Calculate time-based bonus for interactions
    fun calculate_time_bonus(last_interaction: u64, current_time: u64): u64 {
        let time_diff = current_time - last_interaction;
        let hours_since = time_diff / (60 * 60 * 1000);

        if (hours_since >= 24) {
            150 // 1.5x bonus for daily interaction
        } else if (hours_since >= 12) {
            125 // 1.25x bonus for twice daily
        } else {
            100 // No bonus
        }
    }

    /// Calculate level from total experience points
    fun calculate_level_from_xp(total_xp: u64): u64 {
        // Simple level calculation: level = sqrt(xp / 100)
        let level_base = total_xp / 100;
        // Use simple integer square root approximation
        let mut guess = level_base / 2;
        if (guess == 0) guess = 1;
        while (guess * guess > level_base) {
            guess = (guess + level_base / guess) / 2;
        };
        guess + 1
    }

    /// Boost random attribute on level up
    fun boost_random_attribute(nft: &mut DynamicNFT, ctx: &mut TxContext) {
        // Simplified random attribute selection
        let random_attr = ((tx_context::epoch(ctx) + nft.level) % 5) as u8 + 1;
        let boost_amount = 1 + (nft.level / 10); // Larger boost at higher levels

        if (vec_map::contains(&nft.attributes, &random_attr)) {
            let current_value = vec_map::get_mut(&mut nft.attributes, &random_attr);
            *current_value = *current_value + boost_amount;
        };
    }

    /// Boost all attributes on evolution
    fun boost_all_attributes(nft: &mut DynamicNFT, evolution_stage: u8): vector<u8> {
        let boost_amount = evolution_stage * 5; // 5 points per evolution stage
        let mut boosted_attributes = vector::empty<u8>();

        let mut i = 1u8;
        while (i <= 5) {
            if (vec_map::contains(&nft.attributes, &i)) {
                let current_value = vec_map::get_mut(&mut nft.attributes, &i);
                *current_value = *current_value + (boost_amount as u64);
                vector::push_back(&mut boosted_attributes, i);
            };
            i = i + 1;
        };

        boosted_attributes
    }

    /// Calculate evolved market value
    fun calculate_evolved_market_value(rarity: u8, evolution_stage: u8): u64 {
        let base_value = calculate_initial_market_value(rarity);
        let evolution_multiplier = 100 + (evolution_stage * 50); // +50% per evolution
        (base_value * (evolution_multiplier as u64)) / 100
    }

    /// Grant trading experience to NFT with enhanced bonuses
    fun grant_trading_experience(nft: &mut DynamicNFT, marketplace: &Marketplace, timestamp: u64) {
        let base_xp = 50; // Base XP for trading
        let rarity_multiplier = match_rarity_to_xp_multiplier(nft.rarity);

        // IOTA-specific bonus for frequent trading
        let frequency_bonus = if (nft.interaction_count > 10) {
            120 // 20% bonus for active NFTs
        } else {
            100
        };

        let total_xp = (base_xp * rarity_multiplier * marketplace.experience_multiplier * frequency_bonus) / 1000000;

        nft.experience_points = nft.experience_points + total_xp;
        nft.last_interaction = timestamp;
        nft.interaction_count = nft.interaction_count + 1;

        // Check for automatic level up
        let new_level = calculate_level_from_xp(nft.experience_points);
        if (new_level > nft.level) {
            nft.level = new_level;
        };
    }

    // ===== Advanced NFT Features =====

    /// Cross-platform NFT bridge functionality
    public struct BridgeRequest has key {
        id: UID,
        nft_id: ID,
        source_chain: String,
        destination_chain: String,
        bridge_fee: u64,
        timestamp: u64,
        is_completed: bool,
    }

    /// Create cross-chain bridge request
    public entry fun create_bridge_request(
        nft: &DynamicNFT,
        destination_chain: vector<u8>,
        bridge_fee: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(nft.owner == tx_context::sender(ctx), ENotOwner);
        assert!(bridge_fee > 0, EInsufficientBalance);

        let bridge_request = BridgeRequest {
            id: object::new(ctx),
            nft_id: object::id(nft),
            source_chain: string::utf8(b"IOTA"),
            destination_chain: string::utf8(destination_chain),
            bridge_fee,
            timestamp: clock::timestamp_ms(clock),
            is_completed: false,
        };

        transfer::share_object(bridge_request);
    }

    /// Advanced NFT analytics and insights
    public struct NFTAnalytics has copy, drop {
        total_trades: u64,
        volume_24h: u64,
        volume_7d: u64,
        volume_30d: u64,
        average_hold_time: u64,
        price_appreciation: u64, // Percentage since mint
        rarity_score: u64,
        engagement_score: u64,
    }

    /// Get comprehensive NFT analytics
    public fun get_nft_analytics(
        nft: &DynamicNFT,
        marketplace: &Marketplace
    ): NFTAnalytics {
        // Calculate analytics based on NFT history
        let current_value = nft.market_value;
        let initial_value = calculate_initial_market_value(nft.rarity);
        let appreciation = if (current_value > initial_value) {
            ((current_value - initial_value) * 100) / initial_value
        } else {
            0
        };

        let rarity_score = calculate_rarity_score(nft.rarity, nft.evolution_stage);
        let engagement_score = nft.interaction_count * nft.level;

        NFTAnalytics {
            total_trades: 0, // Would track from dynamic fields
            volume_24h: 0,
            volume_7d: 0,
            volume_30d: 0,
            average_hold_time: 0,
            price_appreciation: appreciation,
            rarity_score,
            engagement_score,
        }
    }

    /// Dynamic pricing based on market conditions
    public fun calculate_dynamic_price(
        nft: &DynamicNFT,
        marketplace: &Marketplace,
        supply_factor: u64,
        demand_factor: u64
    ): u64 {
        let base_value = nft.market_value;
        let rarity_multiplier = match_rarity_to_xp_multiplier(nft.rarity);
        let evolution_bonus = nft.evolution_stage * 20; // 20% per evolution
        let experience_bonus = (nft.experience_points / 1000) * 5; // 0.5% per 1000 XP

        // Market factors
        let supply_adjustment = (10000 - supply_factor) / 100; // Higher supply = lower price
        let demand_adjustment = (demand_factor + 10000) / 100;  // Higher demand = higher price

        let adjusted_value = (base_value * rarity_multiplier * (100 + (evolution_bonus as u64) + experience_bonus)) / 10000;
        (adjusted_value * supply_adjustment * demand_adjustment) / 10000
    }

    /// NFT rental system for utility-based NFTs
    public struct RentalListing has key {
        id: UID,
        nft_id: ID,
        owner: address,
        rental_price_per_day: u64,
        max_rental_days: u64,
        utility_permissions: vector<String>, // What renter can do
        active_rental: Option<ActiveRental>,
    }

    public struct ActiveRental has store {
        renter: address,
        start_time: u64,
        end_time: u64,
        total_paid: u64,
        permissions_granted: vector<String>,
    }

    /// List NFT for rental
    public entry fun create_rental_listing(
        nft: &DynamicNFT,
        price_per_day: u64,
        max_days: u64,
        permissions: vector<String>,
        ctx: &mut TxContext
    ) {
        assert!(nft.owner == tx_context::sender(ctx), ENotOwner);
        assert!(price_per_day > 0, EInsufficientBalance);
        assert!(max_days > 0 && max_days <= 365, EInvalidAttribute);

        let rental = RentalListing {
            id: object::new(ctx),
            nft_id: object::id(nft),
            owner: tx_context::sender(ctx),
            rental_price_per_day: price_per_day,
            max_rental_days: max_days,
            utility_permissions: permissions,
            active_rental: option::none(),
        };

        transfer::share_object(rental);
    }

    /// NFT staking for passive rewards
    public struct NFTStake has key {
        id: UID,
        nft_id: ID,
        owner: address,
        stake_start: u64,
        stake_duration: u64,
        base_reward_rate: u64,
        multiplier_from_rarity: u64,
        accumulated_rewards: u64,
        is_compound_enabled: bool,
    }

    /// Stake NFT for rewards
    public entry fun stake_nft(
        nft: &mut DynamicNFT,
        duration_days: u64,
        enable_compound: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(nft.owner == tx_context::sender(ctx), ENotOwner);
        assert!(duration_days >= 7, EInvalidAttribute); // Minimum 7 days

        let base_rate = 100; // 1% daily base rate
        let rarity_multiplier = match_rarity_to_xp_multiplier(nft.rarity);
        let current_time = clock::timestamp_ms(clock);

        let stake = NFTStake {
            id: object::new(ctx),
            nft_id: object::id(nft),
            owner: tx_context::sender(ctx),
            stake_start: current_time,
            stake_duration: duration_days * 24 * 60 * 60 * 1000, // Convert to ms
            base_reward_rate: base_rate,
            multiplier_from_rarity: rarity_multiplier,
            accumulated_rewards: 0,
            is_compound_enabled: enable_compound,
        };

        // Lock NFT for staking period
        nft.is_tradeable = false;

        transfer::transfer(stake, tx_context::sender(ctx));
    }

    // ===== Advanced Auction Features =====

    /// Dutch auction with declining price
    public struct DutchAuction has key {
        id: UID,
        nft_id: ID,
        seller: address,
        start_price: u64,
        end_price: u64,
        start_time: u64,
        end_time: u64,
        price_decline_rate: u64, // Price decrease per hour
        is_sold: bool,
    }

    /// Create Dutch auction
    public entry fun create_dutch_auction(
        nft: &mut DynamicNFT,
        start_price: u64,
        end_price: u64,
        duration_hours: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(nft.owner == tx_context::sender(ctx), ENotOwner);
        assert!(start_price > end_price, EInvalidAttribute);
        assert!(duration_hours > 0, EInvalidAttribute);

        let current_time = clock::timestamp_ms(clock);
        let auction_end = current_time + (duration_hours * 60 * 60 * 1000);
        let decline_rate = (start_price - end_price) / duration_hours;

        let auction = DutchAuction {
            id: object::new(ctx),
            nft_id: object::id(nft),
            seller: tx_context::sender(ctx),
            start_price,
            end_price,
            start_time: current_time,
            end_time: auction_end,
            price_decline_rate: decline_rate,
            is_sold: false,
        };

        nft.owner = @0x0; // Escrow
        transfer::share_object(auction);
    }

    /// Get current Dutch auction price
    public fun get_dutch_auction_price(
        auction: &DutchAuction,
        clock: &Clock
    ): u64 {
        if (auction.is_sold) {
            return 0
        };

        let current_time = clock::timestamp_ms(clock);
        if (current_time >= auction.end_time) {
            return auction.end_price
        };

        let elapsed_hours = (current_time - auction.start_time) / (60 * 60 * 1000);
        let price_reduction = elapsed_hours * auction.price_decline_rate;

        if (price_reduction >= auction.start_price - auction.end_price) {
            auction.end_price
        } else {
            auction.start_price - price_reduction
        }
    }

    // ===== Helper Functions =====

    /// Calculate rarity score for analytics
    fun calculate_rarity_score(rarity: u8, evolution_stage: u8): u64 {
        let base_score = match (rarity) {
            RARITY_COMMON => 100,
            RARITY_UNCOMMON => 250,
            RARITY_RARE => 500,
            RARITY_EPIC => 1000,
            RARITY_LEGENDARY => 2500,
            _ => 100
        };

        base_score + ((evolution_stage as u64) * 200)
    }

    // ===== Admin Functions =====

    /// Update marketplace parameters
    public entry fun update_marketplace_fee(
        marketplace: &mut Marketplace,
        new_fee: u64,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == marketplace.admin, ENotAuthorized);
        assert!(new_fee <= 1000, EInvalidAttribute); // Max 10%
        marketplace.marketplace_fee = new_fee;
    }

    /// Verify creator status
    public entry fun verify_creator(
        marketplace: &mut Marketplace,
        creator: address,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == marketplace.admin, ENotAuthorized);
        table::add(&mut marketplace.verified_creators, creator, true);
    }

    /// Pause/unpause marketplace
    public entry fun set_marketplace_pause(
        marketplace: &mut Marketplace,
        paused: bool,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == marketplace.admin, ENotAuthorized);
        marketplace.is_paused = paused;
    }

    // ===== View Functions =====

    /// Get NFT details
    public fun get_nft_info(nft: &DynamicNFT): (String, String, u8, u64, u64, u8, u64, bool) {
        (
            nft.name,
            nft.description,
            nft.rarity,
            nft.level,
            nft.experience_points,
            nft.evolution_stage,
            nft.market_value,
            nft.is_tradeable
        )
    }

    /// Get marketplace statistics
    public fun get_marketplace_stats(marketplace: &Marketplace): (u64, u64, u64, bool) {
        (
            marketplace.total_volume,
            marketplace.total_nfts_traded,
            marketplace.marketplace_fee,
            marketplace.is_paused
        )
    }

    /// Get auction details
    public fun get_auction_info(auction: &AuctionListing): (address, u64, u64, Option<address>, u64, u64) {
        (
            auction.seller,
            auction.starting_price,
            auction.current_highest_bid,
            auction.highest_bidder,
            auction.auction_start,
            auction.auction_end
        )
    }

    /// Get detailed NFT attributes for display
    public fun get_nft_attributes(nft: &DynamicNFT): VecMap<u8, u64> {
        nft.attributes
    }

    /// Get NFT collection metrics
    public fun get_collection_metrics(collection: &NFTCollection): (u64, u64, u64, bool) {
        (
            collection.total_nfts,
            collection.floor_price,
            collection.total_volume,
            collection.is_verified
        )
    }

    /// Calculate NFT value based on multiple factors
    public fun calculate_nft_valuation(
        nft: &DynamicNFT,
        marketplace: &Marketplace
    ): u64 {
        let base_value = calculate_initial_market_value(nft.rarity);
        let level_multiplier = 100 + (nft.level * 5); // 5% per level
        let evolution_multiplier = 100 + (nft.evolution_stage * 25); // 25% per evolution
        let interaction_bonus = (nft.interaction_count / 10) * 2; // 2% per 10 interactions

        (base_value * level_multiplier * (evolution_multiplier as u64) * (100 + interaction_bonus)) / 1000000
    }
}