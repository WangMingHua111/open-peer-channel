# open-peer-channel
基于PostMessage的对象和方法的双向通讯库，支持基本的Message通讯，和另一个页面的远程方法调用。

  npm install open-peer-channel

# [Demo](https://wangminghua111.github.io/open-peer-channel/test/ "Demo")

**index.html**

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试</title>
  <script src="../dist/open-peer-channel.umd.js"></script>
</head>

<body>
  <div>我是父级页面</div>
  <iframe id="fm" src="index2.html" frameborder="0" style="background-color: rgb(123, 130, 193);"></iframe>
  <iframe id="fm2" src="index3.html" frameborder="0" style="background-color: rgb(123, 130, 193);"></iframe>
</body>

<script>


  const channel = opc.create({
    id: '22',
  })
  channel
    .register({
      aaa: 456
    })
    .register({
      bbb: 123
    })

  const f = () => {
    class abc {
      constructor(){
        this.c = 1
      }
    }
    function akk () {
      return '123'
    }
    channel.register(abc).register(akk)
  }
  f()
  channel.flag = '我是父级页面'

  function AAA() {
    console.log('成功调用')
    return '我是结果'
  }
  console.log(channel)
  setTimeout(() => {
    channel.push(`父级发送：${new Date()}`)

  }, 5000)
</script>

</html>
```

**index2.html**

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试2</title>
  <script src="../dist/open-peer-channel.umd.js"></script>
</head>

<body>
  <div>我是子级页面1</div>
</body>

<script>
  const channel = opc.create({
    id: 22,
    parent: window.parent
  })

  channel.message((d) => {
    console.log(document.body.innerText, d)
  })

  setTimeout(() => {
    // 执行远程方法调用
    channel.call(() => {
      console.log('远程调用', akk())
      const el = document.createElement('div')
      el.innerText = new Date().toString()
      document.body.appendChild(el)
      return AAA()
    }).then(result => {
      console.log('调用结果：', result)
      const el = document.createElement('div')
      el.innerText = `调用结果：${result}`
      document.body.appendChild(el)
    }).catch(error => {
      console.log('调用失败：', error)
      const el = document.createElement('div')
      el.innerText = `调用失败：${error}`
      document.body.appendChild(el)
    })
  }, 3000)
  // console.log(channel)
</script>

</html>
```

**index3.html**

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试2</title>
  <script src="../dist/open-peer-channel.umd.js"></script>
</head>

<body>
  <div>我是子级页面2</div>
</body>

<script>
  const channel = opc.create({
    id: 22,
    parent: window.parent
  })

  channel.message((d) => {
    console.log(document.body.innerText, d)
  })
  // console.log(channel)
</script>

</html>
```


