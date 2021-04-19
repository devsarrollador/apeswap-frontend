import React from 'react'
import { Route, useRouteMatch } from 'react-router-dom'
import BigNumber from 'bignumber.js'
import styled from 'styled-components'
import { useWallet } from '@binance-chain/bsc-use-wallet'
import { Heading, Image, BaseLayout, Flex } from '@apeswapfinance/uikit'
import { BLOCKS_PER_YEAR } from 'config'
import orderBy from 'lodash/orderBy'
import partition from 'lodash/partition'
import useI18n from 'hooks/useI18n'
import useBlock from 'hooks/useBlock'
import { getBalanceNumber } from 'utils/formatBalance'
import { useFarms, usePriceBnbBusd, useStatsOverall, useGnanaPools } from 'state/hooks'
import { QuoteToken, PoolCategory } from 'config/constants/types'
import FlexLayout from 'components/layout/Flex'
import Coming from '../../../Pools/components/Coming'
import PoolCard from '../../../Pools/components/PoolCard'
import PoolTabButtons from '../../../Pools/components/PoolTabButtons'
import Divider from '../../../Pools/components/Divider'

const Hero = styled.div`
  align-items: center;
  color: ${({ theme }) => theme.colors.primary};
  margin-left: auto;
  margin-right: auto;
  max-width: 250px;
  ul {
    margin: 0;
    padding: 0;
    list-style-type: none;
    font-size: 16px;
    li {
      margin-bottom: 4px;
    }
  }
  img {
    height: auto;
    max-width: 100%;
  }
  @media (min-width: 576px) {
    grid-template-columns: 1fr 1fr;
    margin: 0;
    max-width: none;
  }
`

const StyledUL = styled.ul`
  margin-bottom: 20px !important;
`

const StyledLI = styled.li`
  font-size: 18px;
  font-family: 'Poppins';
`

const StyledImage = styled(Image)`
  padding-top: 250px;
  margin-left: auto;
  margin-right: auto;
`

const Cards = styled(BaseLayout)`
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 53px;
  padding-right: 53px;
  margin-bottom: 50px;
  & > div {
    grid-column: span 6;
    width: 100%;
  }

  ${({ theme }) => theme.mediaQueries.sm} {
    & > div {
      grid-column: span 8;
    }
  }

  ${({ theme }) => theme.mediaQueries.lg} {
    & > div:first-child {
      grid-column: span 4;
    }
    & > div:last-child {
      grid-column: span 8;
    }
  }
`

const Pools: React.FC = () => {
  const { path } = useRouteMatch()
  const TranslateString = useI18n()
  const { account } = useWallet()
  const farms = useFarms()
  const pools = useGnanaPools(account)
  const { statsOverall } = useStatsOverall()
  const bnbPriceUSD = usePriceBnbBusd()
  const block = useBlock()

  const priceToBnb = (tokenName: string, tokenPrice: BigNumber, quoteToken: QuoteToken): BigNumber => {
    const tokenPriceBN = new BigNumber(tokenPrice)
    if (tokenName === 'BNB') {
      return new BigNumber(1)
    }
    if (tokenPrice && quoteToken === QuoteToken.BUSD) {
      return tokenPriceBN.div(bnbPriceUSD)
    }
    return tokenPriceBN
  }

  const poolsWithApy = pools.map((pool) => {
    const isBnbPool = pool.poolCategory === PoolCategory.BINANCE
    const rewardTokenFarm = farms.find((f) => f.tokenSymbol === pool.tokenName)
    const stakingTokenFarm = farms.find((s) => s.tokenSymbol === pool.stakingTokenName)
    const stats = statsOverall?.incentivizedPools?.find((x) => x.id === pool.sousId)
    let rewardTokenPrice = stats?.rewardTokenPrice

    let stakingTokenPriceInBNB
    let rewardTokenPriceInBNB

    if (pool.lpData) {
      const rewardToken = pool.lpData.token1.symbol === pool.tokenName ? pool.lpData.token1 : pool.lpData.token0
      stakingTokenPriceInBNB = new BigNumber(pool.lpData.reserveETH).div(new BigNumber(pool.lpData.totalSupply))
      rewardTokenPriceInBNB = new BigNumber(rewardToken.derivedETH)
    } else if (rewardTokenPrice) {
      stakingTokenPriceInBNB = priceToBnb(pool.stakingTokenName, new BigNumber(stats?.price), QuoteToken.BUSD)
      rewardTokenPriceInBNB = priceToBnb(pool.tokenName, new BigNumber(rewardTokenPrice), QuoteToken.BUSD)
    } else {
      // /!\ Assume that the farm quote price is BNB
      stakingTokenPriceInBNB = isBnbPool ? new BigNumber(1) : new BigNumber(stakingTokenFarm?.tokenPriceVsQuote)
      rewardTokenPriceInBNB = priceToBnb(
        pool.tokenName,
        rewardTokenFarm?.tokenPriceVsQuote,
        rewardTokenFarm?.quoteTokenSymbol,
      )
      rewardTokenPrice = bnbPriceUSD.times(rewardTokenPriceInBNB).toNumber()
    }

    const totalRewardPricePerYear = rewardTokenPriceInBNB.times(pool.tokenPerBlock).times(BLOCKS_PER_YEAR)
    const totalStakingTokenInPool = stakingTokenPriceInBNB.times(getBalanceNumber(pool.totalStaked))
    const apy = totalRewardPricePerYear.div(totalStakingTokenInPool).times(100)

    return {
      ...pool,
      isFinished: pool.sousId === 0 ? false : pool.isFinished || block > pool.endBlock,
      apy,
      rewardTokenPrice,
    }
  })

  const [finishedPools, openPools] = partition(poolsWithApy, (pool) => pool.isFinished)

  return (
    <Cards>
      <Hero>
        <Flex flexDirection="column">
          <StyledImage src="/images/pool-ape.png" alt="ApeSwap illustration" width={228} height={220} responsive />
          <Flex flexDirection="column">
            <Heading as="h1" size="xl" mb="16px">
              {TranslateString(282, 'Golden Banana fiesta')}
            </Heading>
            <StyledUL>
              <StyledLI>{TranslateString(580, 'Stake GNANA to earn new tokens.')}</StyledLI>
              <StyledLI>{TranslateString(404, 'You can unstake at any time.')}</StyledLI>
              <StyledLI>{TranslateString(406, 'Rewards are calculated per block.')}</StyledLI>
            </StyledUL>
            <PoolTabButtons justifyContent="flex-start" />
          </Flex>
        </Flex>
      </Hero>
      <div>
        <FlexLayout>
          <Route exact path={`${path}`}>
            <>
              {orderBy(openPools, ['sortOrder']).map((pool) => (
                <PoolCard key={pool.sousId} pool={pool} />
              ))}
              <Coming />
            </>
          </Route>
          <Route path={`${path}/history`}>
            {orderBy(finishedPools, ['sortOrder']).map((pool) => (
              <PoolCard key={pool.sousId} pool={pool} />
            ))}
          </Route>
        </FlexLayout>
      </div>
    </Cards>
  )
}

export default Pools
